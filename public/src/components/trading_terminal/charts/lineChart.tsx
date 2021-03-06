import * as React from "react";
import { Fragment } from "react";

import { ohlcPointType, intervalType } from "./types";
import { getUnit } from "./utils";

export interface LineChartProps {
    stockId: number
    tabName: string
	data: ohlcPointType[]
	interval: intervalType
}

export interface LineChartState {
    stockId: number
    data: ohlcPointType[]
}

// Chart will be exposed globally by the ChartJS script included in index.html
declare var Chart: any;
declare var moment: any;

export class LineChart extends React.Component<LineChartProps, LineChartState> {
    chartElem: any;
	constructor(props: LineChartProps) {
		super(props);
		this.state  = {
            stockId: props.stockId,
            data: props.data
		};
	}

    // convert ohlcPointType to { x: time, y: closePrice }
    ohlcToOnlyC(p: ohlcPointType) {
        const d = new Date();
        d.setTime(p.t);
        return { x: d, y: p.c };
    }

	componentWillReceiveProps(nextProps: LineChartProps) {
		// update the data and the chart, don't render the thing again pls
		if (nextProps.data) {
			this.chartElem.data.datasets = [{
				data: nextProps.data.map(this.ohlcToOnlyC),
				fractionalDigitsCount: 2,
			}];
			this.chartElem.options.scales.xAxes[0].time.unit = getUnit(this.props.interval);
			this.chartElem.update();
		}
    }

	componentDidMount() {
		const cvs = document.getElementById("line-chart") as HTMLCanvasElement;
		const ctx = cvs!.getContext('2d')!;

        const data = this.state.data.map(this.ohlcToOnlyC);

		this.chartElem = new Chart(ctx, {
			type: 'line',
			data: {
				datasets: [{
					data: data,
					fractionalDigitsCount: 2,
				}]
			},
			options: {
				scales: {
					xAxes: [{
						type: 'time',
						time: {
							unit: getUnit(this.props.interval),
							tooltipFormat: "ddd MMM Do h:mm a",
						},
						ticks: {
							autoSkip: true,
							maxTicksLimit: 20,
							maxRotation: 0,
						}
					}]
				},
				legend: {
					display: false,
				},
				tooltips: {
					position: 'nearest',
					mode: 'index',
				},
			},
		});
	}

	render() {
		return (
			<div className="ui tab inverted" data-tab={this.props.tabName} id={this.props.tabName}>
				<canvas id="line-chart"></canvas>
			</div>
		);
	}
}