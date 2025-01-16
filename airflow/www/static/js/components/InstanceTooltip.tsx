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

import React from "react";
import { Box, Text } from "@chakra-ui/react";
import { snakeCase } from "lodash";

import { getGroupAndMapSummary } from "src/utils";
import { formatDuration, getDuration } from "src/datetime_utils";
import type { TaskInstance, Task } from "src/types";
import Time from "src/components/Time";

type Instance = Pick<
  TaskInstance,
  | "taskId"
  | "startDate"
  | "endDate"
  | "state"
  | "runId"
  | "mappedStates"
  | "note"
  | "tryNumber"
>;

interface Props {
  group?: Task;
  instance: Instance;
  dagId?: string;
}

const InstanceTooltip = ({
  group,
  instance: {
    taskId,
    startDate,
    endDate,
    state,
    runId,
    mappedStates,
    note,
    tryNumber,
  },
  dagId,
}: Props) => {
  const isGroup = !!group?.children;
  const isMapped = !!group?.isMapped;
  const summary: React.ReactNode[] = [];

  let totalTasks = 1;
  if (group) {
    const { totalTasks: total, childTaskMap } = getGroupAndMapSummary({
      group,
      runId,
      mappedStates,
    });
    totalTasks = total;

    childTaskMap.forEach((key, val) => {
      const childState = snakeCase(val);
      if (key > 0) {
        summary.push(
          <Text key={childState} ml="10px">
            {childState}
            {": "}
            {key}
          </Text>
        );
      }
    });
  }

  return (
    <Box py="2px">
      {!!dagId && <Text>流程: {dagId}</Text>}
      <Text>实例: {taskId}</Text>
      {!!group?.setupTeardownType && (
        <Text>类型: {group.setupTeardownType}</Text>
      )}
      {group?.tooltip && <Text>{group.tooltip}</Text>}
      {isMapped && totalTasks > 0 && (
        <Text>
          映射任务: {totalTasks}
          {/*{isGroup && " group"}*/}
          {/*{totalTasks > 1 && "s"}*/}
        </Text>
      )}
      <Text>
        {/*{isGroup || totalTasks ? "Overall " : ""}*/}
        状态: {state || "no status"}
      </Text>
      {/*{(isGroup || isMapped) && summary}*/}
      {startDate && (
        <>
          <Text>
            开始时间: <Time dateTime={startDate} />
          </Text>
          {endDate && (
            <Text>
              结束时间: <Time dateTime={endDate} />
            </Text>
          )}
          <Text>
            耗时: {formatDuration(getDuration(startDate, endDate))}
          </Text>
        </>
      )}
      {tryNumber && tryNumber > 1 && <Text>重试次数: {tryNumber}</Text>}
      {group?.triggerRule && <Text>触发规则: {group.triggerRule}</Text>}
      {note && <Text>Contains a note</Text>}
    </Box>
  );
};

export default InstanceTooltip;
