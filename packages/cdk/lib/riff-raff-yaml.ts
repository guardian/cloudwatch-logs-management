import { writeFileSync } from 'fs';
import path from 'path';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import type { App } from 'aws-cdk-lib';
import { Token } from 'aws-cdk-lib';
import type { CfnFunction } from 'aws-cdk-lib/aws-lambda';
import { dump } from 'js-yaml';

interface RiffRaffYaml {
	regions: Set<string>;
	allowedStages: Set<string>;
	deployments: Map<RiffRaffDeploymentName, RiffRaffDeploymentProps>;
}

type RiffRaffDeploymentName = string;

interface RiffRaffDeploymentProps {
	type: string;
	stacks: Set<string>;
	app: string;
	contentDirectory: string;
	parameters: Record<string, string | boolean>;
	dependencies?: RiffRaffDeploymentName[];
	actions?: string[];
}

interface RiffRaffDeployment {
	name: RiffRaffDeploymentName;
	props: RiffRaffDeploymentProps;
}

// TODO `GuLambdaFunction` already takes `fileName` as a prop, can it expose it?
const getLambdaFileName = (lambda: GuLambdaFunction): string => {
	const {
		app,
		node: { defaultChild },
	} = lambda;

	const { code } = defaultChild as CfnFunction;
	const inferredFilename = `${app}.zip`;

	if (Token.isUnresolved(code)) {
		console.log(
			`Lambda's code is unresolved. Inferring lambda filename to ${inferredFilename}`,
		);
		return inferredFilename;
	}

	const { s3Key } = code as CfnFunction.CodeProperty;
	if (!s3Key) {
		throw new Error('Only S3 based lambdas are supported');
	}
	return s3Key.split('/').at(-1) ?? inferredFilename;
};

export class RiffRaffYamlFile {
	private readonly riffRaffYaml: RiffRaffYaml;
	private readonly outDir: string;
	private readonly guStacks: GuStack[];

	private getRegions(): Set<string> {
		return new Set(
			this.guStacks.map(({ region }) => {
				if (Token.isUnresolved(region)) {
					throw new Error('Region is a token');
				}
				return region;
			}),
		);
	}

	private getStages(): Set<string> {
		return new Set(this.guStacks.map((_) => _.stage));
	}

	private getLambdas(stack: GuStack): GuLambdaFunction[] {
		return stack.node
			.findAll()
			.filter(
				(construct) => construct instanceof GuLambdaFunction,
			) as GuLambdaFunction[];
	}

	private getUploadLambdaDeployment(
		lambda: GuLambdaFunction,
	): RiffRaffDeployment {
		const { app } = lambda;

		const fileName = getLambdaFileName(lambda);
		const { stack } = lambda.stack as GuStack;

		return {
			name: `${app}-upload-${stack}`,
			props: {
				type: 'aws-lambda',
				stacks: new Set([stack]),
				app,
				contentDirectory: path.parse(fileName).name,
				parameters: {
					bucketSsmLookup: true,
					lookupByTags: true,
					fileName,
				},
				actions: ['uploadLambda'],
			},
		};
	}

	private getUpdateLambdaDeployment(
		lambda: GuLambdaFunction,
	): RiffRaffDeployment {
		const { app } = lambda;

		const fileName = getLambdaFileName(lambda);
		const { stack } = lambda.stack as GuStack;

		return {
			name: `${app}-update-${stack}`,
			props: {
				type: 'aws-lambda',
				stacks: new Set([stack]),
				app,
				contentDirectory: path.parse(fileName).name,
				parameters: {
					bucketSsmLookup: true,
					lookupByTags: true,
					fileName,
				},
				actions: ['updateLambda'],
			},
		};
	}

	private getCloudFormationDeployment({
		stack,
		templateFile,
		constructor: { name },
	}: GuStack): RiffRaffDeployment {
		const kebabClassName = name
			.replace(/([a-z])([A-Z])/g, '$1-$2')
			.toLowerCase();
		const deploymentName = [kebabClassName, 'cfn', stack].join('-');

		return {
			name: deploymentName,
			props: {
				type: 'cloud-formation',
				stacks: new Set([stack]),
				app: kebabClassName,
				contentDirectory: `${this.outDir}`,
				parameters: {
					templatePath: templateFile,
				},
			},
		};
	}

	constructor(app: App) {
		const { outdir, node } = app;
		this.outDir = outdir;

		const stacks: GuStack[] = node
			.findAll()
			.filter((construct) => construct instanceof GuStack) as GuStack[];

		this.guStacks = stacks;

		const regions = this.getRegions();
		const allowedStages = this.getStages();

		const deployments = new Map<
			RiffRaffDeploymentName,
			RiffRaffDeploymentProps
		>();

		stacks.forEach((stack) => {
			const lambdas = this.getLambdas(stack);

			const uploadLambda = lambdas.map((lambda) =>
				this.getUploadLambdaDeployment(lambda),
			);

			uploadLambda.forEach(({ name, props }) => {
				deployments.set(name, props);
			});

			const { name: cfnDeployName, props: cfnDeployProps } =
				this.getCloudFormationDeployment(stack);

			deployments.set(cfnDeployName, {
				...cfnDeployProps,
				dependencies: uploadLambda.map(({ name }) => name),
			});

			const updateLambda = lambdas.map((lambda) =>
				this.getUpdateLambdaDeployment(lambda),
			);

			updateLambda.forEach(({ name, props }) => {
				deployments.set(name, {
					...props,
					dependencies: [cfnDeployName],
				});
			});
		});

		this.riffRaffYaml = {
			regions,
			allowedStages,
			deployments,
		};
	}

	toYAML(): string {
		// Add support for ES6 Set and Map. See https://github.com/nodeca/js-yaml/issues/436.
		const replacer = (key: string, value: unknown) => {
			if (value instanceof Set) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- this is how `js-yaml` is typed
				return Array.from(value);
			}
			if (value instanceof Map) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- this is how `js-yaml` is typed
				return Object.fromEntries(value);
			}
			return value;
		};

		return dump(this.riffRaffYaml, { replacer });
	}

	synth(): void {
		const ourPath = path.join(this.outDir, 'riff-raff.yaml');
		writeFileSync(ourPath, this.toYAML());
	}
}
