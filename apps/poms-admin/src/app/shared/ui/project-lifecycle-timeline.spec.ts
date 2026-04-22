import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectLifecycleTimeline, type ProjectLifecycleTimelineItem } from './project-lifecycle-timeline';

@Component({
    standalone: true,
    imports: [ProjectLifecycleTimeline],
    template: `<app-project-lifecycle-timeline [items]="items" />`
})
class HostComponent {
    items: ProjectLifecycleTimelineItem[] = [
        {
            key: 'assessment',
            label: '需求评估',
            description: '确认项目是否值得推进。',
            state: 'done',
            completedAtLabel: '2026-04-01'
        },
        {
            key: 'handover',
            label: '实施移交',
            description: '准备移交实施团队。',
            state: 'current',
            detail: '当前责任人：商务负责人'
        },
        {
            key: 'acceptance',
            label: '验收',
            description: '等待验收条件满足。',
            state: 'pending'
        }
    ];
}

describe('ProjectLifecycleTimeline', () => {
    let fixture: ComponentFixture<HostComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HostComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
    });

    it('renders horizontal and vertical lifecycle structures without snake wrapping', () => {
        const nativeElement: HTMLElement = fixture.nativeElement;

        expect(nativeElement.querySelector('.lc-h')).not.toBeNull();
        expect(nativeElement.querySelector('.lc-v')).not.toBeNull();
        expect(nativeElement.querySelector('.lc-rail')).not.toBeNull();
        expect(nativeElement.textContent).toContain('项目生命周期');
        expect(nativeElement.textContent).toContain('需求评估');
        expect(nativeElement.textContent).toContain('验收');
    });

    it('keeps each horizontal label inside the same stage node as its marker', () => {
        const nativeElement: HTMLElement = fixture.nativeElement;
        const horizontalNodes = Array.from(nativeElement.querySelectorAll<HTMLElement>('.lc-h .lc-node'));

        expect(horizontalNodes).toHaveLength(3);
        expect(horizontalNodes[0].querySelector('.lc-marker')?.getAttribute('aria-label')).toContain('需求评估');
        expect(horizontalNodes[0].querySelector('.lc-label')?.textContent).toContain('需求评估');
        expect(horizontalNodes[1].querySelector('.lc-marker')?.getAttribute('aria-label')).toContain('实施移交');
        expect(horizontalNodes[1].querySelector('.lc-label')?.textContent).toContain('实施移交');
    });

    it('exposes completed node details through visible text and marker aria labels', () => {
        const nativeElement: HTMLElement = fixture.nativeElement;
        const markers = Array.from(nativeElement.querySelectorAll<HTMLElement>('.lc-marker'));
        const doneMarker = markers.find((marker) => marker.getAttribute('aria-label')?.includes('需求评估'));

        expect(nativeElement.textContent).toContain('完成：2026-04-01');
        expect(nativeElement.textContent).toContain('当前责任人：商务负责人');
        expect(doneMarker?.getAttribute('aria-label')).toContain('完成时间：2026-04-01');
    });

    it('uses state-specific marker classes for completed, current and pending stages', () => {
        const nativeElement: HTMLElement = fixture.nativeElement;

        expect(nativeElement.querySelector('.lc-done')).not.toBeNull();
        expect(nativeElement.querySelector('.lc-current')).not.toBeNull();
        expect(nativeElement.querySelector('.lc-pending')).not.toBeNull();
    });
});
