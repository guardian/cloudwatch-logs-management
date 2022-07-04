import type { ECS } from 'aws-sdk';
import type { Tag, TaskDefinition } from 'aws-sdk/clients/ecs';
import type { Tags } from './model';

export interface TaskDefinitionWithTags {
	taskDefinition: TaskDefinition;
	tags: Tags;
}

async function getAllTaskDefinitionArns(ecs: ECS): Promise<string[]> {
	async function rec(acc: string[], token?: string): Promise<string[]> {
		const result = await ecs
			.listTaskDefinitions({
				nextToken: token,
			})
			.promise();
		const newAcc = acc.concat(result.taskDefinitionArns ?? []);
		if (result.nextToken) {
			return rec(newAcc, result.nextToken);
		} else {
			return newAcc;
		}
	}
	return rec([]);
}

function convertTags(tags: Tag[]): Tags {
	const tagsObject: Record<string, string> = {};
	tags.forEach((t) => {
		if (t.key && t.value) {
			tagsObject[t.key] = t.value;
		}
	});
	return tagsObject;
}

function describeTaskDefinitions(ecs: ECS, arns: string[]) {
	return Promise.all(
		arns.map(async (arn) => {
			return await ecs
				.describeTaskDefinition({ taskDefinition: arn, include: ['TAGS'] })
				.promise();
		}),
	);
}

export async function getAllTaskDefinitions(
	ecs: ECS,
): Promise<TaskDefinitionWithTags[]> {
	try {
		const arns = await getAllTaskDefinitionArns(ecs);
		const definitions = await describeTaskDefinitions(ecs, arns);

		return definitions
			.filter((d) => d.taskDefinition)
			.map((d) => {
				return {
					taskDefinition: d.taskDefinition,
					tags: convertTags(d.tags ?? []),
				};
			}) as TaskDefinitionWithTags[];
	} catch (e: unknown) {
		console.error('Failed to fetch task definition tags', e);
		return [];
	}
}
