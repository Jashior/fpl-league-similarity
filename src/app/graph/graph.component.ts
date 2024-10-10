import { CommonModule } from '@angular/common';
import { Component, inject, Signal, effect, computed } from '@angular/core';
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
        const isHighlightedManager = highlightedManagers.includes(
          manager.team_id
        );

        if (isHighlightedManager) {
          return {
            value: [manager.tsne_x, manager.tsne_y],
            name: manager.manager_name,
            team_name: manager.team_name,
            team_id: manager.team_id,
            rank: manager.rank,
            totalPoints: manager.total_points,
            gw_points: manager.gw_points,
            gw_rank: manager.gw_rank,
            players: manager.players_owned,
            captain: manager.captain,
            itemStyle: {
              color: '#ffffff',
            },
            symbolSize: 14,
            label: {
              show: true,
              position: 'right',
              formatter: '{b}',
              textStyle: {
                color: '#ffffff',
                fontSize: 8,
              },
            },
            z: 2,
          };
        } else {
          const ownsHighlightedPlayers = manager.players_owned.some(
            (playerId) => highlightedPlayers.includes(playerId)
          );

          return {
            value: [manager.tsne_x, manager.tsne_y],
            name: manager.manager_name,
            team_name: manager.team_name,
            team_id: manager.team_id,
            rank: manager.rank,
            totalPoints: manager.total_points,
            gw_points: manager.gw_points,
            gw_rank: manager.gw_rank,
            players: manager.players_owned,
            captain: manager.captain,
            itemStyle: {
              color: ownsHighlightedPlayers ? '#3bda55' : '#5470C6',
            },
            symbolSize: 10,
            label: {
              show: false,
            },
          };
        }
      });

      return {
        tooltip: {
          show: true,
          formatter: (params: any) => {
            return `<b>${params.data.name}</b><br/>
                    <small>
                    Team: ${params.data.team_name}<br/>
                    </small>
                    Captain: ${this.getCaptainFromId(params.data.captain)}<br/>
                    Rank: ${this.formatNumber(params.data.rank)}<br/>
                    Total Points: ${this.formatNumber(
                      params.data.totalPoints
                    )}<br/>
                    Gameweek Points: ${this.formatNumber(
                      params.data.gw_points
                    )}<br/>
                    Gameweek Rank: ${this.formatNumber(params.data.gw_rank)}`;
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
              position: 'right',
              formatter: '{b}',
              textStyle: {
                color: '#ffffff',
                fontSize: 12,
              },
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
            start: 0,
            end: 100,
          },
          {
            type: 'slider',
            yAxisIndex: [0],
            start: 0,
            end: 100,
          },
        ],
      };
    });
  }

  private formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  onChartClick(event: any) {
    if (event.data && event.data.team_id) {
      // Detect if it's a mobile device
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );

      if (isMobile) {
        this.dataService.toggleHighlightedManager(event.data.team_id);
      } else {
        // Open the FPL link in a new tab on desktop
        const url = `https://fantasy.premierleague.com/entry/${
          event.data.team_id
        }/event/${this.currentGameweek()}`;
        window.open(url, '_blank');
      }
    }
  }

  getCaptainFromId(id: number) {
    return this.dataService.getNameFromId(id);
  }
}
