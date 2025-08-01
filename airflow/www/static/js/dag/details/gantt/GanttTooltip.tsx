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
import { getDuration, formatDuration } from "src/datetime_utils";
import Time from "src/components/Time";
import type { Task, API } from "src/types";

type Instance = Pick<
  API.TaskInstance,
  "startDate" | "endDate" | "tryNumber" | "queuedWhen"
>;

interface Props {
  instance: Instance;
  task: Task;
}

const GanttTooltip = ({ task, instance }: Props) => {
  const isGroup = !!task.children;
  const isMappedOrGroupSummary = isGroup || task.isMapped;

  // Calculate durations in ms
  const taskDuration = getDuration(instance?.startDate, instance?.endDate);
  const queuedDuration =
    instance?.queuedWhen &&
    (instance?.startDate ? instance.queuedWhen < instance.startDate : true)
      ? getDuration(instance.queuedWhen, instance?.startDate)
      : 0;
  return (
    <Box>
      <Text>
        任务{isGroup ? " Group" : ""}: {task.label}
      </Text>
      {!!instance?.tryNumber && <Text>重试次数: {instance.tryNumber}</Text>}
      <br />
      {instance?.queuedWhen && (
        <Text>
          {isMappedOrGroupSummary && "Total "}队列耗时:{" "}
          {formatDuration(queuedDuration)}
        </Text>
      )}
      <Text>
        {isMappedOrGroupSummary && "Total "}运行耗时:{" "}
        {formatDuration(taskDuration)}
      </Text>
      <br />
      {instance?.queuedWhen && (
        <Text>
          {isMappedOrGroupSummary && "Earliest "}入队列时间:{" "}
          <Time dateTime={instance?.queuedWhen} />
        </Text>
      )}
      {instance?.startDate && (
        <Text>
          {isMappedOrGroupSummary && "Earliest "}开始时间:{" "}
          <Time dateTime={instance?.startDate} />
        </Text>
      )}
      {instance?.endDate && (
        <Text>
          {isMappedOrGroupSummary && "Latest "}结束时间:{" "}
          <Time dateTime={instance?.endDate} />
        </Text>
      )}
    </Box>
  );
};

export default GanttTooltip;
