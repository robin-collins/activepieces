import fs from 'fs/promises'
import path from 'path'
import { flowRepo } from '../../flows/flow/flow.repo'
import { flowService } from '../../flows/flow/flow.service'
import { projectService } from '../../project/project-service'
import { GitFile } from './project-diff/project-diff.service'
import { ProjectMappingState } from './project-diff/project-mapping-state'
import { ProjectSyncError } from '@activepieces/ee-shared'
import { Flow, FlowOperationType, PopulatedFlow } from '@activepieces/shared'


async function getStateFromDB(projectId: string): Promise<PopulatedFlow[]> {
    const flows = await flowRepo().findBy({
        projectId,
    })
    return Promise.all(
        flows.map((f) => {
            return flowService.getOnePopulatedOrThrow({
                id: f.id,
                projectId,
                removeConnectionsName: false,
                removeSampleData: true,
            })
        }),
    )
}

async function getMappingStateFromGit(
    stateFolderPath: string,
    projectId: string,
): Promise<ProjectMappingState> {
    const _statePath = path.join(stateFolderPath, projectId + '.json')
    try {
        const state = await fs.readFile(_statePath, 'utf-8')
        return new ProjectMappingState(JSON.parse(state))
    }
    catch (e) {
        return ProjectMappingState.empty()
    }
}

async function getStateFromGit(flowPath: string): Promise<GitFile[]> {
    const flowFiles = await fs.readdir(flowPath)
    const parsedFlows: GitFile[] = []
    for (const file of flowFiles) {
        // Extract base file name
        const flow: PopulatedFlow = JSON.parse(
            await fs.readFile(path.join(flowPath, file), 'utf-8'),
        )
        parsedFlows.push({
            flow,
            baseFilename: path.basename(file, '.json'),
        })
    }
    return parsedFlows
}

async function createFlowInProject(flow: PopulatedFlow, projectId: string): Promise<PopulatedFlow> {
    const createdFlow = await flowService.create({
        projectId,
        request: {
            displayName: flow.version.displayName,
            projectId,
        },
    })
    return updateFlowInProject(createdFlow.id, flow, projectId)
}

async function updateFlowInProject(targetFlowId: string, flow: PopulatedFlow,
    projectId: string,
): Promise<PopulatedFlow> {
    const project = await projectService.getOneOrThrow(projectId)
    return flowService.update({
        id: targetFlowId,
        projectId,
        lock: true,
        userId: project.ownerId,
        operation: {
            type: FlowOperationType.IMPORT_FLOW,
            request: {
                displayName: flow.version.displayName,
                trigger: flow.version.trigger,
            },
        },
    })
}

async function republishFlow(flowId: string, projectId: string): Promise<ProjectSyncError | null> {
    const project = await projectService.getOneOrThrow(projectId)
    const flow = await flowService.getOnePopulated({ id: flowId, projectId })
    if (!flow) {
        return null
    }
    if (!flow.version.valid) {
        return {
            flowId,
            message: `Flow ${flow.version.displayName} #${flow.id} is not valid`,
        }
    }
    try {
        await flowService.update({
            id: flowId,
            projectId,
            lock: true,
            userId: project.ownerId,
            operation: {
                type: FlowOperationType.LOCK_AND_PUBLISH,
                request: {},
            },
        })
        return null
    }
    catch (e) {
        return {
            flowId,
            message: `Failed to publish flow ${flow.version.displayName} #${flow.id}`,
        }
    }

}
async function upsertFlowToGit(fileName: string, flow: Flow, flowFolderPath: string): Promise<void> {
    const flowJsonPath = path.join(flowFolderPath, `${fileName}.json`)
    await fs.writeFile(flowJsonPath, JSON.stringify(flow, null, 2))
}

async function deleteFlowFromGit(flowId: string, flowFolderPath: string): Promise<void> {
    const flowJsonPath = path.join(flowFolderPath, `${flowId}.json`)
    await fs.unlink(flowJsonPath)
}

async function deleteFlowFromProject(flowId: string, projectId: string): Promise<void> {
    const flow = await flowService.getOne({ id: flowId, projectId })
    if (!flow) {
        return
    }
    await flowService.delete({ id: flowId, projectId })
}

export const gitSyncHelper = {
    getStateFromDB,
    getStateFromGit,
    getMappingStateFromGit,
    upsertFlowToGit,
    deleteFlowFromGit,
    deleteFlowFromProject,
    createFlowInProject,
    updateFlowInProject,
    republishFlow,
}

type DeleteFlowFromProjectOperation = {
    type: 'delete_flow_from_project'
    flowId: string
}

type UpsertFlowIntoProjectOperation = {
    type: 'upsert_flow_into_project'
    flow: PopulatedFlow
}


export type FlowSyncOperation =
    | UpsertFlowIntoProjectOperation
    | DeleteFlowFromProjectOperation
