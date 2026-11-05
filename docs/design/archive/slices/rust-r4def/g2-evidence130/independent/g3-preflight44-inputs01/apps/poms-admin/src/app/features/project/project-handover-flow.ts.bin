import type { ProjectHandoverParticipantInput, ProjectHandoverResponsibilityRole } from '@poms/admin-data-access';

export interface HandoverDutySelection {
    roleKey: ProjectHandoverResponsibilityRole;
    userId: string;
    responsibilitySummary: string;
}

export function handoverParticipants(duties: readonly HandoverDutySelection[]): ProjectHandoverParticipantInput[] {
    const users = new Map<string, ProjectHandoverParticipantInput>();
    for (const duty of duties) {
        if (!duty.userId || !duty.responsibilitySummary.trim()) throw new Error('请选定每项职责的人员并填写责任说明。');
        const user = users.get(duty.userId) ?? { userId: duty.userId, responsibilities: [] };
        if (user.responsibilities.some((item) => item.roleKey === duty.roleKey)) throw new Error('同一人员的职责重复。');
        user.responsibilities.push({ roleKey: duty.roleKey, responsibilitySummary: duty.responsibilitySummary.trim() });
        users.set(duty.userId, user);
    }
    return [...users.values()];
}

/** The route epoch, separate from request ordering, prevents late commands from acknowledging another project. */
export class HandoverRouteEpoch {
    #epoch = 0;
    #project = '';
    enter(projectId: string): void {
        this.#project = projectId;
        this.#epoch++;
    }
    ticket(): { projectId: string; epoch: number } {
        return { projectId: this.#project, epoch: this.#epoch };
    }
    accepts(ticket: { projectId: string; epoch: number }): boolean {
        return ticket.epoch === this.#epoch && ticket.projectId === this.#project;
    }
}
