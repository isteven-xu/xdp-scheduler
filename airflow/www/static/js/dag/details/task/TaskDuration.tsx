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

import useSelection from "src/dag/useSelection";
import { useGridData } from "src/api";
import { startCase } from "lodash";
import { getDuration, formatDateTime, defaultFormat } from "src/datetime_utils";
import ReactECharts, { ReactEChartsProps } from "src/components/ReactECharts";
import type { TaskInstance } from "src/types";
import { getTask } from "src/utils";

interface TaskInstanceDuration extends TaskInstance {
  executionDate?: string | null;
  dataIntervalStart?: string | null;
  dataIntervalEnd?: string | null;
  runDuration: moment.Duration;
  runDurationUnit: number;
  queuedDuration: moment.Duration;
  queuedDurationUnit: number;
}

const TaskDuration = () => {
  const {
    selected: { taskId },
    onSelect,
  } = useSelection();

  const {
    data: { dagRuns, groups, ordering },
  } = useGridData();
  let maxDuration = 0;
  let unit = "秒";
  let unitDivisor = 1;

  const task = getTask({ taskId, task: groups });

  if (!task) return null;
  const orderingLabel = ordering[0] || ordering[1] || "startDate";

  const durations: (TaskInstanceDuration | {})[] = dagRuns.map((dagRun) => {
    const { runId } = dagRun;
    const instance = task.instances.find((ti) => ti && ti.runId === runId);
    if (!instance) return {};
    // @ts-ignore
    const runDuration = moment.duration(
      instance.startDate
        ? getDuration(instance.startDate, instance?.endDate)
        : 0
    );

    // @ts-ignore
    const queuedDuration = moment.duration(
      instance.queuedDttm &&
        instance.startDate &&
        instance.startDate > instance.queuedDttm
        ? getDuration(instance.queuedDttm, instance.startDate)
        : 0
    );

    if (runDuration.asSeconds() > maxDuration) {
      maxDuration = runDuration.asSeconds();
    }

    if (maxDuration <= 60 * 2) {
      unit = "秒";
      unitDivisor = 1;
    } else if (maxDuration <= 60 * 60 * 2) {
      unit = "分钟";
      unitDivisor = 60;
    } else if (maxDuration <= 24 * 60 * 60 * 2) {
      unit = "hours";
      unitDivisor = 60 * 60;
    } else {
      unit = "天";
      unitDivisor = 60 * 60 * 24;
    }

    const runDurationUnit = runDuration.asSeconds();
    const queuedDurationUnit = queuedDuration.asSeconds();

    return {
      ...instance,
      [orderingLabel]: dagRun ? dagRun[orderingLabel] : instance.startDate,
      runDuration,
      queuedDuration,
      runDurationUnit,
      queuedDurationUnit,
    };
  });

  // @ts-ignore
  function formatTooltip(args) {
    const { data } = args[0];
    const {
      runId,
      queuedDttm,
      startDate,
      state,
      endDate,
      tryNumber,
      queuedDurationUnit,
      runDurationUnit,
    } = data;

    return `
      实例ID: ${runId} <br>
<!--      ${startCase(orderingLabel)}: ${formatDateTime(data[orderingLabel])} <br>-->
      逻辑时间: ${formatDateTime(data[orderingLabel])} <br>
      ${tryNumber && tryNumber > -1 ? `重试次数: ${tryNumber} <br>` : ""}
      状态: ${state} <br>
      ${queuedDttm ? `入队列时间: ${formatDateTime(queuedDttm)} <br>` : ""}
      开始时间: ${startDate && formatDateTime(startDate)} <br>
      结束时间: ${endDate && formatDateTime(endDate || undefined)} <br>
      ${
        queuedDttm
          ? `队列耗时: ${queuedDurationUnit.toFixed(2)} ${unit}<br>`
          : ""
      }
      运行耗时: ${runDurationUnit.toFixed(2)} ${unit}<br>
      ${
        queuedDttm
          ? `总耗时: ${(queuedDurationUnit + runDurationUnit).toFixed(
              2
            )} ${unit}<br>`
          : ""
      }
    `;
  }

  function formatMarkLineLegendName(name: string) {
    switch (name) {
      case "runDurationUnit":
        return "总耗时中位数";
      case "queuedDurationUnit":
        return "队列耗时中位数";
      default:
        return name;
    }
  }

  const option: ReactEChartsProps["option"] = {
    legend: {
      orient: "horizontal",
      icon: "circle",
      formatter: formatMarkLineLegendName,
      data: [
        {
          name: "runDurationUnit",
          itemStyle: { color: "blue" },
        },
        {
          name: "queuedDurationUnit",
          itemStyle: { color: stateColors.queued },
        },
      ],
    },
    series: [
      {
        type: "bar",
        barMinHeight: 0.1,
        itemStyle: {
          color: stateColors.queued,
          opacity: 0.6,
        },
        stack: "x",
        markLine: {
          silent: true,
          data: [{ type: "median", lineStyle: { color: stateColors.queued } }],
        },
      },
      {
        type: "bar",
        barMinHeight: 1,
        itemStyle: {
          // @ts-ignore
          color: (params) => stateColors[params.data.state],
        },
        stack: "x",
        markLine: {
          silent: true,
          data: [{ type: "median", lineStyle: { color: "blue" } }],
        },
      },
    ],
    // @ts-ignore
    dataset: {
      dimensions: ["runId", "queuedDurationUnit", "runDurationUnit"],
      source: durations.map((duration) => {
        if (duration) {
          const durationInSeconds = duration as TaskInstanceDuration;
          return {
            ...durationInSeconds,
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
      name: "逻辑时间",
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
        taskId: params.data.taskId,
        runId: params.data.runId,
      });
    },
  };

  return <ReactECharts option={option} events={events} />;
};

export default TaskDuration;
