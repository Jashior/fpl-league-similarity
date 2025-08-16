import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  Signal,
  effect,
  computed,
  signal,
  WritableSignal,
} from '@angular/core';
import { ECElementEvent, EChartsOption } from 'echarts';
import { NgxEchartsDirective, provideEcharts } from 'ngx-echarts';
import { DataService, ManagerData } from '../services/data.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  templateUrl: './graph.component.html',
  styleUrl: './graph.component.scss',
  providers: [provideEcharts()],
})
export class GraphComponent {
  private dataService: DataService = inject(DataService);

  loading: Signal<boolean> = toSignal(this.dataService.loading$, {
    initialValue: false,
  });

  managerData: Signal<ManagerData[]> = toSignal(this.dataService.managerData$, {
    initialValue: [],
  });

  highlightedManagers: Signal<number[]> = toSignal(
    this.dataService.highlightedManagers$,
    { initialValue: [] }
  );

  highlightedPlayers: Signal<number[]> = toSignal(
    this.dataService.highlightedPlayers$,
    { initialValue: [] }
  );

  currentGameweek: Signal<number> = toSignal(
    this.dataService.currentGameweek$,
    { initialValue: 0 }
  );

  chartOption: Signal<EChartsOption>;

  constructor() {
    this.chartOption = this.createChartOptionSignal();
  }

  private createChartOptionSignal(): Signal<EChartsOption> {
    return computed(() => {
      const highlightedManagers = this.highlightedManagers();
      const highlightedPlayers = this.highlightedPlayers();
      const data = this.managerData().map((manager) => {
        const isHighlightedManager = manager.team_ids.some((id) =>
          highlightedManagers.includes(id)
        );

        const isMobile = this.isMobileDevice();
        const baseSize = isMobile ? 6 : 12;
        const symbolSize = baseSize + manager.manager_count * 1.5; // Scale size by manager count

        if (isHighlightedManager) {
          return {
            value: [manager.tsne_x, manager.tsne_y],
            name: manager.manager_names.join(', '),
            manager: manager,
            itemStyle: {
              color: '#ffffff',
            },
            symbolSize: symbolSize + 2, // Make highlighted even bigger
            label: {
              show: true,
              position: 'insideTop',
              formatter: manager.manager_count > 1 ? `{b|Group of ${manager.manager_count}}` : '{b}',
              rich: {
                b: {
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 'bold',
                  textShadowColor: 'rgba(0, 0, 0, 0.8)',
                  textShadowBlur: 3,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  padding: [2, 4],
                  borderRadius: 2,
                }
              }
            },
            z: 2,
          };
        } else {
          const ownsHighlightedPlayers = manager.players_owned.some(
            (playerId) => highlightedPlayers.includes(playerId)
          );

          return {
            value: [manager.tsne_x, manager.tsne_y],
            manager: manager,
            name: manager.manager_names.join(', '),
            itemStyle: {
              color: ownsHighlightedPlayers ? '#3bda55' : '#5470C6',
            },
            symbolSize: symbolSize,
            label: {
              show: false,
            },
          };
        }
      });

      return {
        tooltip: {
          show: true,
          trigger: 'item',
          axisPointer: {
            type: 'shadow',
            label: {
              show: true,
            },
          },
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
              .tooltip-container .manager-list {
                padding-left: 10px;
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
          show: false,
          splitLine: { show: false },
        },
        yAxis: {
          type: 'value',
          show: false,
          splitLine: { show: false },
        },
        series: [
          {
            type: 'scatter',
            data: data,
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
        dataZoom: [
          {
            type: 'inside',
            xAxisIndex: [0],
            start: 0,
            end: 100,
          },
          {
            type: 'inside',
            yAxisIndex: [0],
            start: 0,
            end: 100,
          },
          {
            type: 'slider',
            xAxisIndex: [0],
            handleSize: 75,
            height: 30,
          },
          {
            type: 'slider',
            yAxisIndex: [0],
            handleSize: 75,
            width: 30,
          },
        ],
      };
    });
  }

  private formatNumber(num: number | null): string {
    if (num === null) return 'N/A';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  onChartClick(event: any) {
    if (event.data && event.data.manager && event.data.manager.team_ids) {
      const isMobile = this.isMobileDevice();
      if (!isMobile) {
        const url = `https://fantasy.premierleague.com/entry/${event.data.manager.team_ids[0]}/event/${this.currentGameweek()}`;
        window.open(url, '_blank');
      } else {
        //
      }
    }
  }

  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  getCaptainFromId(id: number) {
    return this.dataService.getNameFromId(id);
  }
}

