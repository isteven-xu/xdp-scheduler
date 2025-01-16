/*!
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/* global moment */

import React from "react";
import { startCase } from "lodash";
import type { SeriesOption } from "echarts";

import useSelection from "src/dag/useSelection";
import { useGridData } from "src/api";
import { getDuration, formatDateTime, defaultFormat } from "src/datetime_utils";
import ReactECharts, { ReactEChartsProps } from "src/components/ReactECharts";
import type { DagRun } from "src/types";

interface RunDuration extends DagRun {
  landingDuration: moment.Duration;
  landingDurationUnit: number;
  queuedDuration: moment.Duration;
  queuedDurationUnit: number;
  runDuration: moment.Duration;
  runDurationUnit: number;
}

interface Props {
  showLandingTimes?: boolean;
}

const RunDurationChart = ({ showLandingTimes }: Props) => {
  const { onSelect } = useSelection();

  const {
    data: { dagRuns, ordering },
  } = useGridData();

  let maxDuration = 0;
  let unit = "秒";
  let unitDivisor = 1;

  const orderingLabel = ordering[0] || ordering[1] || "startDate";

  const durations: (RunDuration | {})[] = dagRuns.map((dagRun) => {
    // @ts-ignore
    const landingDuration = moment.duration(
      getDuration(dagRun.dataIntervalEnd, dagRun.queuedAt || dagRun.startDate)
    );

    // @ts-ignore
    const runDuration = moment.duration(
      dagRun.startDate ? getDuration(dagRun.startDate, dagRun?.endDate) : 0
    );

    // @ts-ignore
    const queuedDuration = moment.duration(
      dagRun.queuedAt && dagRun.startDate && dagRun.startDate > dagRun.queuedAt
        ? getDuration(dagRun.queuedAt, dagRun.startDate)
        : 0
    );

    if (showLandingTimes) {
      if (landingDuration.asSeconds() > maxDuration) {
        maxDuration = landingDuration.asSeconds();
      }
    } else if (runDuration.asSeconds() > maxDuration) {
      maxDuration = runDuration.asSeconds();
    }

    if (maxDuration <= 60 * 2) {
      unit = "秒";
      unitDivisor = 1;
    } else if (maxDuration <= 60 * 60 * 2) {
      unit = "分钟";
      unitDivisor = 60;
    } else if (maxDuration <= 24 * 60 * 60 * 2) {
      unit = "小时";
      unitDivisor = 60 * 60;
    } else {
      unit = "天";
      unitDivisor = 60 * 60 * 24;
    }

    const landingDurationUnit = landingDuration.asSeconds();
    const queuedDurationUnit = queuedDuration.asSeconds();
    const runDurationUnit = runDuration.asSeconds();

    return {
      ...dagRun,
      landingDuration,
      runDuration,
      queuedDuration,
      landingDurationUnit,
      runDurationUnit,
      queuedDurationUnit,
    };
  });

  // @ts-ignore
  function formatTooltip(args) {
    const { data } = args[0];
    const {
      runId,
      queuedAt,
      startDate,
      logicalDate,
      dataIntervalStart,
      dataIntervalEnd,
      state,
      endDate,
      queuedDurationUnit,
      runDurationUnit,
      landingDurationUnit,
    } = data;

    return `
      运行实例ID: ${runId} <br>
      状态: ${state} <br>
      逻辑时间: ${formatDateTime(logicalDate)} <br>
      周期开始时间: ${formatDateTime(dataIntervalStart)} <br>
      周期结束时间: ${formatDateTime(dataIntervalEnd)} <br>
      ${queuedAt ? `入队列时间: ${formatDateTime(queuedAt)} <br>` : ""}
      实际开始时间: ${startDate && formatDateTime(startDate)} <br>
      实际结束时间: ${endDate && formatDateTime(endDate || undefined)} <br>
      至任务结束耗时: ${landingDurationUnit.toFixed(2)} ${unit}<br>
      ${
        queuedAt
          ? `队列等待: ${queuedDurationUnit.toFixed(2)} ${unit}<br>`
          : ""
      }
      运行时间: ${runDurationUnit.toFixed(2)} ${unit}<br>
      总耗时: ${(
        landingDurationUnit +
        queuedDurationUnit +
        runDurationUnit
      ).toFixed(2)} ${unit}<br>
    `;
  }

  const option: ReactEChartsProps["option"] = {
    series: [
      ...(showLandingTimes
        ? [
            {
              type: "bar",
              barMinHeight: 0.1,
              itemStyle: {
                color: stateColors.scheduled,
                opacity: 0.6,
              },
              stack: "x",
            } as SeriesOption,
          ]
        : []),
      {
        type: "bar",
        barMinHeight: 0.1,
        itemStyle: {
          color: stateColors.queued,
          opacity: 0.6,
        },
        stack: "x",
      },
      {
        type: "bar",
        barMinHeight: 1,
        itemStyle: {
          opacity: 1,
          // @ts-ignore
          color: (params) => stateColors[params.data.state],
        },
        stack: "x",
      },
    ],
    // @ts-ignore
    dataset: {
      dimensions: [
        "runId",
        ...(showLandingTimes ? ["landingDurationUnit"] : []),
        "queuedDurationUnit",
        "runDurationUnit",
      ],
      source: durations.map((duration) => {
        if (duration) {
          const durationInSeconds = duration as RunDuration;
          return {
            ...durationInSeconds,
            landingDurationUnit:
              durationInSeconds.landingDurationUnit / unitDivisor,
            queuedDurationUnit:
              durationInSeconds.queuedDurationUnit / unitDivisor,
            runDurationUnit: durationInSeconds.runDurationUnit / unitDivisor,
          };
        }
        return duration;
      }),
    },
    tooltip: {
      trigger: "axis",
      formatter: formatTooltip,
      axisPointer: {
        type: "shadow",
      },
    },
    xAxis: {
      type: "category",
      show: true,
      axisLabel: {
        formatter: (runId: string) => {
          const dagRun = dagRuns.find((dr) => dr.runId === runId);
          if (!dagRun || !dagRun[orderingLabel]) return runId;
          // @ts-ignore
          return moment(dagRun[orderingLabel]).format(defaultFormat);
        },
      },
      // name: startCase(orderingLabel),
      name : "运行日期",
      nameLocation: "end",
      nameGap: 0,
      nameTextStyle: {
        align: "right",
        verticalAlign: "top",
        padding: [30, 0, 0, 0],
      },
    },
    yAxis: {
      type: "value",
      name: `${unit}`,
    },
  };

  const events = {
    // @ts-ignore
    click(params) {
      onSelect({
        runId: params.data.runId,
      });
    },
  };

  return <ReactECharts option={option} events={events} />;
};

export default RunDurationChart;
