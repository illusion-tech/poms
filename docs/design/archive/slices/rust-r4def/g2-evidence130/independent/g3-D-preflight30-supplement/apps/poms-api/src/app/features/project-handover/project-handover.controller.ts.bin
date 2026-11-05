import type {
    ConfirmProjectHandoverResult,
    ContractHandoverSummaryView,
    ProjectHandoverDetailView,
    RebaselineContractHandoverResult,
} from "../../core/rust-r4def-frozen-native-reference";
import {
    ConfirmProjectHandoverRequestSchema,
    RebaselineContractHandoverRequestSchema,
    parseFrozenNativeReference,
} from "../../core/rust-r4def-frozen-native-reference";
import { Inject, Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Request, NotImplementedException } from "@nestjs/common";
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags, ApiCreatedResponse } from "@nestjs/swagger";
import {
    ConfirmProjectHandoverRequestDto,
    ConfirmProjectHandoverResultDto,
    ContractHandoverSummaryViewDto,
    ProjectHandoverDetailViewDto,
    RebaselineContractHandoverRequestDto,
    RebaselineContractHandoverResultDto,
    PrepareProjectHandoverRequestDto,
    ConfirmProjectHandoverParticipantRequestDto,
} from "@poms/api-contracts";
import type { UserPayload } from "@poms/shared-contracts";
import { HasPermissions } from "../../core/auth/decorators/has-permissions.decorator";
import { buildSensitiveFieldProjectionRequestContext } from "../../core/sensitive-field-projection/sensitive-field-projection-request-context";
import type { RuntimeAuditRequestLike } from "../../core/runtime-audit/runtime-audit-request.utils";
import { ProjectHandoverCommandService } from "./project-handover-command.service";
import { ProjectHandoverQueryService } from "./project-handover-query.service";

@ApiTags("Project Handover")
@ApiCookieAuth("pomsSession")
@Controller()
export class ProjectHandoverController {
    constructor(
        @Inject(ProjectHandoverQueryService) private readonly projectHandoverQueryService: ProjectHandoverQueryService,
        @Inject(ProjectHandoverCommandService) private readonly projectHandoverCommandService: ProjectHandoverCommandService,
    ) {}

    @Get("projects/:projectId/contract-handover")
    @HasPermissions("project:read")
    @ApiOperation({ summary: "获取项目合同承接摘要" })
    @ApiOkResponse({ type: ContractHandoverSummaryViewDto })
    getContractHandoverSummary(
        @Param("projectId") projectId: string,
        @Request() req: RuntimeAuditRequestLike & { user: UserPayload },
    ): Promise<ContractHandoverSummaryView> {
        return this.projectHandoverQueryService.getContractHandoverSummary(
            projectId,
            req.user,
            buildSensitiveFieldProjectionRequestContext(req, `/projects/${projectId}/contract-handover`),
        );
    }

    @Get("projects/:projectId/project-handover")
    @HasPermissions("project:read")
    @ApiOperation({ summary: "获取项目最新移交详情" })
    @ApiOkResponse({ type: ProjectHandoverDetailViewDto })
    getProjectHandoverDetailByProject(
        @Param("projectId") projectId: string,
        @Request() req: RuntimeAuditRequestLike & { user: UserPayload },
    ): Promise<ProjectHandoverDetailView> {
        return this.projectHandoverQueryService.getProjectHandoverDetailByProjectId(
            projectId,
            req.user,
            buildSensitiveFieldProjectionRequestContext(req, `/projects/${projectId}/project-handover`),
        );
    }

    @Get("project-handovers/:id")
    @HasPermissions("project:read")
    @ApiOperation({ summary: "获取指定移交详情" })
    @ApiOkResponse({ type: ProjectHandoverDetailViewDto })
    getProjectHandoverDetailByHandover(
        @Param("id") handoverId: string,
        @Request() req: RuntimeAuditRequestLike & { user: UserPayload },
    ): Promise<ProjectHandoverDetailView> {
        return this.projectHandoverQueryService.getProjectHandoverDetailByHandoverId(
            handoverId,
            req.user,
            buildSensitiveFieldProjectionRequestContext(req, `/project-handovers/${handoverId}`),
        );
    }

    @Post("project-handovers/:id\\:confirm")
    @HasPermissions("project:write")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "确认项目移交" })
    @ApiOkResponse({ type: ConfirmProjectHandoverResultDto })
    confirmProjectHandover(
        @Param("id") handoverId: string,
        @Request() req: { user: UserPayload },
        @Body() body: ConfirmProjectHandoverRequestDto,
    ): Promise<ConfirmProjectHandoverResult> {
        return this.projectHandoverCommandService.confirmProjectHandover(
            handoverId,
            req.user.sub,
            parseFrozenNativeReference(ConfirmProjectHandoverRequestSchema, body),
        );
    }

    @Post("contract-handover-rebaselines")
    @HasPermissions("project:write")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "发起合同移交前再基线化" })
    @ApiOkResponse({ type: RebaselineContractHandoverResultDto })
    rebaselineContractHandover(
        @Request() req: { user: UserPayload },
        @Body() body: RebaselineContractHandoverRequestDto,
    ): Promise<RebaselineContractHandoverResult> {
        return this.projectHandoverCommandService.rebaselineContractHandover(
            req.user.sub,
            parseFrozenNativeReference(RebaselineContractHandoverRequestSchema, body),
        );
    }

    // Rust owns these new commands. Native remains a labelled source-reference runtime.
    @Post("projects/:projectId/project-handovers")
    @HasPermissions("project:write")
    @ApiOperation({ summary: "准备真实项目移交与职责确认材料" })
    @ApiCreatedResponse({ type: ProjectHandoverDetailViewDto })
    prepareProjectHandover(@Param("projectId") projectId: string, @Body() body: PrepareProjectHandoverRequestDto): Promise<ProjectHandoverDetailView> {
        void projectId;
        void body;
        return Promise.reject(new NotImplementedException("Real handover preparation is implemented by the Rust backend"));
    }

    @Post("project-handovers/:id/participant-confirmations")
    @HasPermissions("project:read")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "当前参与人确认本人承担的移交职责" })
    @ApiOkResponse({ type: ProjectHandoverDetailViewDto })
    confirmProjectHandoverParticipant(@Param("id") id: string, @Body() body: ConfirmProjectHandoverParticipantRequestDto): Promise<ProjectHandoverDetailView> {
        void id;
        void body;
        return Promise.reject(new NotImplementedException("Real participant confirmation is implemented by the Rust backend"));
    }
}
