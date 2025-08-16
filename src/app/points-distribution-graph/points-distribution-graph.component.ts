import { tuiItemsHandlersProvider } from '@taiga-ui/kit';
import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  Signal,
  computed,
  WritableSignal,
  signal,
} from '@angular/core';
import { EChartsOption } from 'echarts';
import { NgxEchartsDirective, provideEcharts } from 'ngx-echarts';
import { DataService, ManagerData } from '../services/data.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { Platform } from '@angular/cdk/platform';

@Component({
  selector: 'app-point-distribution-graph',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  template: `
    <div
      class="echarts-container h-full w-full"
      echarts
      [options]="chartOption()"
      (chartClick)="onChartClick($event)"
    ></div>
  `,
  styleUrls: ['./points-distribution-graph.component.scss'],
  providers: [provideEcharts()],
})
export class PointDistributionGraphComponent {
  private dataService: DataService = inject(DataService);
  private platform: Platform = inject(Platform);

  managerData: Signal<ManagerData[]> = toSignal(this.dataService.managerData$, {
    initialValue: [],
  });

  highlightedManagers: Signal<number[]> = toSignal(
    this.dataService.highlightedManagers$,
    { initialValue: [] }
  );

  currentGameweek: Signal<number> = toSignal(
    this.dataService.currentGameweek$,
    { initialValue: 0 }
  );

  highlightedPlayers: Signal<number[]> = toSignal(
    this.dataService.highlightedPlayers$,
    { initialValue: [] }
  );

  chartOption: Signal<EChartsOption> = computed(() => {
    const data = this.managerData();
    const highlightedManagers = this.highlightedManagers();
    const currentGameweek = this.currentGameweek();
    const highlightedPlayers = this.highlightedPlayers();
    const pointsMap = new Map<number, ManagerData[]>();
    let minPoints = Infinity;
    let maxPoints = -Infinity;

    data.forEach((manager) => {
      const points = manager.gw_points;
      minPoints = Math.min(minPoints, points);
      maxPoints = Math.max(maxPoints, points);
      if (!pointsMap.has(points)) {
        pointsMap.set(points, []);
      }
      pointsMap.get(points)!.push(manager);
    });

    const scatterData = Array.from(pointsMap.entries()).flatMap(
      ([points, managers]) =>
        managers.map((manager, index) => {
          const isHighlighted = manager.team_ids.some((id) =>
            highlightedManagers.includes(id)
          );
          const hasHighlightedPlayers = highlightedPlayers.some((playerId) =>
            manager.players_owned.includes(playerId)
          );

          // Check if device is mobile
          const isMobile =
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
              navigator.userAgent
            );

          // Adjust sizes based on device type
          const baseSize = isMobile ? 5 : 10;
          const symbolSize = baseSize + manager.manager_count * 1.5; // Scale size by manager count

          return {
            value: [points, index],
            name: manager.manager_names[0], // Display first manager name for label
            manager: manager,
            itemStyle: {
              color: isHighlighted
                ? '#ffffff'
                : hasHighlightedPlayers
                ? '#3bda55'
                : '#5470C6',
            },
            symbolSize: isHighlighted ? symbolSize + 2 : symbolSize,
            label: {
              show: isHighlighted || manager.manager_count > 1,
              position: 'top',
              formatter: manager.manager_count > 1 ? `{b|Group of ${manager.manager_count}}` : '{b}',
              rich: {
                b: {
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 'bold',
                  textShadowColor: 'rgba(0, 0, 0, 0.8)',
                  textShadowBlur: 3,
                  textShadowOffsetX: 1,
                  textShadowOffsetY: 1,
                  backgroundColor: 'rgba(0, 0, 0, 1)',
                  padding: [2, 4],
                  borderRadius: 2,
                },
              },
            },
            labelLayout: {
              hideOverlap: true,
              moveOverlap: 'shiftY',
            },
            z: isHighlighted ? 2 : 1,
          };
        })
    );

    var maxCount = Math.max(
      ...Array.from(pointsMap.values()).map((arr) => arr.length)
    );
    if (!(this.platform.IOS || this.platform.ANDROID)) {
      maxCount = maxCount * 1.5;
    }

    const xAxisMin = Math.floor(minPoints / 5) * 5;
    const xAxisMax = Math.ceil(maxPoints / 5) * 5;

    return {
      title: {
        text: `Gameweek ${currentGameweek} Points Distribution`,
        left: 'center',
      },
      tooltip: {
        show: true,
        trigger: 'item',
        triggerOn: this.isMobileDevice() ? 'click' : 'mousemove',
        enterable: true,
        confine: true,
        formatter: (params: any) => {
          const manager = params.data.manager;
          const gameweek = this.currentGameweek();
          const isMobile = this.isMobileDevice();

          const commonStyles = `
            .tooltip-container { 
              font-size: ${isMobile ? '11px' : '14px'};
              position: relative;
              max-height: 200px;
              overflow-y: auto;
            }
            .tooltip-container b { 
              font-size: ${isMobile ? '12px' : '14px'}; 
            }
            .tooltip-container small {
              font-size: ${isMobile ? '10px' : '12px'};
              opacity: 0.8;
            }
            .tooltip-container .row {
              line-height: ${isMobile ? '1.2' : '1.4'};
              margin: ${isMobile ? '1px 0' : '3px 0'};
            }
            .tooltip-container .link {
              color: #5470C6;
              font-size: ${isMobile ? '10px' : '12px'};
              text-decoration: italic;
            }
            .tooltip-container .label {
              text-decoration: underline;
              text-decoration-style: dotted;
              opacity: 0.9;
            }
          `;

          let managerHtml = '';
          if (manager.manager_count > 1) {
            managerHtml = `<div class="row"><b>Group of ${manager.manager_count} managers</b></div><hr/><ul class="manager-list">`;
            manager.manager_names.slice(0, 5).forEach((name: string, index: number) => {
              managerHtml += `<li><small>${name} (${manager.team_names[index]})</small></li>`;
            });
            if (manager.manager_count > 5) {
              managerHtml += `<li><small>...and ${manager.manager_count - 5} more</small></li>`;
            }
            managerHtml += '</ul>';
          } else {
            managerHtml = `
              <div class="row"><b>${manager.manager_names[0]}</b></div>
              <hr/>
              <div class="row"><small>${manager.team_names[0]}</small></div>
            `;
          }

          const teamLink = `https://fantasy.premierleague.com/entry/${manager.team_ids[0]}/event/${gameweek}`;

          return `
          <style>${commonStyles}</style>
          <div class="tooltip-container">
            ${managerHtml}
            <div class="row"><span class="label">Captain</span>: ${this.getCaptainFromId(
              manager.captain
            )}</div>
            <div class="row"><span class="label">Rank</span>: ${this.formatNumber(
              manager.rank
            )}</div>
            <div class="row"><span class="label">Total Points</span>: ${this.formatNumber(
              manager.total_points
            )}</div>
            <div class="row"><span class="label">GW Points</span>: ${this.formatNumber(
              manager.gw_points
            )}</div>
            <div class="row"><span class="label">GW Rank</span>: ${this.formatNumber(
              manager.gw_rank
            )}</div>
            <a href="${teamLink}" target="_blank" class="link">➡️View First Team in Group</a>
          </div>
        `;
        },
      },
      xAxis: {
        type: 'value',
        name: 'Gameweek Points',
        nameLocation: 'middle',
        nameGap: 30,
        min: xAxisMin,
        max: xAxisMax,
        axisLabel: {
          interval: 0,
          rotate: 45,
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: {
        type: 'value',
        name: 'Count',
        nameLocation: 'middle',
        nameGap: 40,
        max: maxCount,
        splitLine: {
          show: false,
        },
      },
      series: [
        {
          type: 'scatter',
          data: scatterData,
          symbolSize: (data: any) => data.symbolSize,
          itemStyle: {
            color: (params: any) => params.data.itemStyle.color,
          },
          label: {
            show: (params: any) => params.data.label.show,
            rich: (params: any) => params.data.label.rich,
            formatter: (params: any) => params.data.label.formatter,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(255, 251, 0, 1)',
              shadowOffsetX: 0,
              shadowOffsetY: 0,
              color: 'rgba(255, 251, 0, 1)',
            },
            scale: 1.3,
          },
        },
      ],
    };
  });

  onChartClick(event: any) {
    if (event.data && event.data.manager && event.data.manager.team_ids) {
      const isMobile = this.isMobileDevice();
      if (!isMobile) {
        const url = `https://fantasy.premierleague.com/entry/${event.data.manager.team_ids[0]}/event/${this.currentGameweek()}`;
        window.open(url, '_blank');
      } else {
      }
    }
  }

  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  private formatNumber(num: number | null): string {
    if (num === null) return 'N/A';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  getCaptainFromId(id: number) {
    return this.dataService.getNameFromId(id);
  }
}

