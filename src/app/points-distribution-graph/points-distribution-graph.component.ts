import { CommonModule } from '@angular/common';
import { Component, inject, Signal, computed } from '@angular/core';
import { EChartsOption } from 'echarts';
import { NgxEchartsDirective, provideEcharts } from 'ngx-echarts';
import { DataService, ManagerData } from '../services/data.service';
import { toSignal } from '@angular/core/rxjs-interop';

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
          const isHighlighted = highlightedManagers.includes(manager.team_id);
          const hasHighlightedPlayers = highlightedPlayers.some((playerId) =>
            manager.players_owned.includes(playerId)
          );

          return {
            value: [points, index],
            name: manager.manager_name,
            manager: manager,
            itemStyle: {
              color: isHighlighted
                ? '#ffffff'
                : hasHighlightedPlayers
                ? '#3bda55'
                : '#5470C6',
            },
            symbolSize: isHighlighted ? 15 : 10,
            label: {
              show: isHighlighted,
              position: 'right',
              formatter: '{b}',
              textStyle: {
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 'bold',
                textShadowColor: 'rgba(0, 0, 0, 0.8)',
                textShadowBlur: 3,
                textShadowOffsetX: 1,
                textShadowOffsetY: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                padding: [2, 4],
                borderRadius: 2,
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

    const maxCount = Math.max(
      ...Array.from(pointsMap.values()).map((arr) => arr.length)
    );

    const xAxisMin = Math.floor(minPoints / 5) * 5;
    const xAxisMax = Math.ceil(maxPoints / 5) * 5;

    return {
      title: {
        text: `Gameweek ${currentGameweek} Points Distribution`,
        left: 'center',
      },
      tooltip: {
        formatter: (params: any) => {
          const manager = params.data.manager;
          return `
            <b><span class="math-inline">${manager.manager_name}</span></b><br/>
            <small>${manager.team_name}</small><br/>
            Rank: ${this.formatNumber(manager.rank)}<br/>
            Total Points: ${this.formatNumber(manager.total_points)}<br/>
            Gameweek Points: ${this.formatNumber(manager.gw_points)}<br/>
            Gameweek Rank: ${this.formatNumber(manager.gw_rank)}
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
    };
  });

  onChartClick(event: any) {
    if (event.data && event.data.manager) {
      const teamId = event.data.manager.team_id;
      if (
        !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        )
      ) {
        const url = `https://fantasy.premierleague.com/entry/${teamId}/event/${this.currentGameweek()}`;
        window.open(url, '_blank');
      } else {
        this.dataService.toggleHighlightedManager(teamId);
      }
    }
  }

  private formatNumber(num: number | null): string {
    if (num === null) return 'N/A';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}
