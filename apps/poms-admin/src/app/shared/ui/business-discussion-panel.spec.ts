import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import {
  type BusinessDiscussionCommentSummary,
  BusinessDiscussionStore,
  BusinessDiscussionTargetObjectType,
  BusinessDiscussionType,
} from '@poms/admin-data-access';
import { BusinessDiscussionPanel } from './business-discussion-panel';

function createComment(overrides: Partial<BusinessDiscussionCommentSummary> = {}): BusinessDiscussionCommentSummary {
  return {
    id: 'comment-1',
    threadId: 'thread-1',
    targetObjectType: BusinessDiscussionTargetObjectType.Lead,
    targetObjectId: 'lead-1',
    targetTitle: '华南地铁线索',
    customerId: 'customer-1',
    leadId: 'lead-1',
    projectId: null,
    discussionType: BusinessDiscussionType.DecisionChain,
    body: '需要尽快确认关键决策人。',
    relatedContactId: null,
    relatedContactName: null,
    relatedCompetitorRecordId: null,
    relatedFollowUpRecordId: null,
    isPinned: true,
    isKeyConclusion: true,
    createdAt: '2026-05-04T08:00:00.000Z',
    createdBy: 'user-1',
    createdByName: '张销售',
    ...overrides,
  };
}

describe('BusinessDiscussionPanel', () => {
  let fixture: ComponentFixture<BusinessDiscussionPanel>;
  let component: BusinessDiscussionPanel;
  let storeMock: {
    comments: ReturnType<typeof signal<BusinessDiscussionCommentSummary[]>>;
    loading: ReturnType<typeof signal<boolean>>;
    saving: ReturnType<typeof signal<boolean>>;
    loaded: ReturnType<typeof signal<boolean>>;
    loadComments: jest.Mock;
    createComment: jest.Mock;
    clearComments: jest.Mock;
  };

  beforeEach(async () => {
    storeMock = {
      comments: signal([createComment()]),
      loading: signal(false),
      saving: signal(false),
      loaded: signal(true),
      loadComments: jest.fn().mockResolvedValue([createComment()]),
      createComment: jest.fn().mockResolvedValue(createComment()),
      clearComments: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [BusinessDiscussionPanel],
    })
      .overrideComponent(BusinessDiscussionPanel, {
        set: {
          providers: [
            {
              provide: BusinessDiscussionStore,
              useValue: storeMock,
            },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(BusinessDiscussionPanel);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('customerId', 'customer-1');
    fixture.componentRef.setInput('leadId', 'lead-1');
    fixture.componentRef.setInput('targetObjectType', BusinessDiscussionTargetObjectType.Lead);
    fixture.componentRef.setInput('targetObjectId', 'lead-1');
    fixture.componentRef.setInput('targetTitle', '华南地铁线索');
    fixture.componentRef.setInput('canWrite', true);
    fixture.componentRef.setInput('title', '线索业务讨论');
    fixture.componentRef.setInput('description', '记录线索推进判断。');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('loads and renders discussion comments from the current context', () => {
    const text = fixture.nativeElement.textContent;

    expect(storeMock.loadComments).toHaveBeenCalledWith({
      customerId: 'customer-1',
      leadId: 'lead-1',
      projectId: undefined,
    });
    expect(text).toContain('需要尽快确认关键决策人。');
    expect(text).toContain('置顶');
    expect(text).toContain('关键结论');
    expect(text).toContain('线索业务讨论');
    expect(text).toContain('记录线索推进判断。');
    expect(text).not.toContain('[object Object]');
  });

  it('creates project discussions with project target while preserving source lead read filters', async () => {
    fixture.componentRef.setInput('projectId', 'project-1');
    fixture.componentRef.setInput('targetObjectType', BusinessDiscussionTargetObjectType.Project);
    fixture.componentRef.setInput('targetObjectId', 'project-1');
    fixture.componentRef.setInput('targetTitle', '华南地铁项目');
    fixture.detectChanges();
    await fixture.whenStable();

    component.showDialog();
    component.updateDiscussionType(BusinessDiscussionType.Strategy);
    component.updateBody('项目侧新增讨论写入当前项目。');

    await component.createDiscussion();

    expect(storeMock.createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        targetObjectType: BusinessDiscussionTargetObjectType.Project,
        targetObjectId: 'project-1',
        discussionType: BusinessDiscussionType.Strategy,
        body: '项目侧新增讨论写入当前项目。',
      }),
      {
        customerId: 'customer-1',
        leadId: 'lead-1',
        projectId: 'project-1',
      },
    );
  });
});
