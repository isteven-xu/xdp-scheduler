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
import { Box, Text, Table, Tbody, Tr, Td } from "@chakra-ui/react";

import useSelection from "src/dag/useSelection";
import { useGridData } from "src/api";
import { getTask } from "src/utils";
import TaskDuration from "./TaskDuration";

const TaskDetails = () => {
  const {
    selected: { taskId },
  } = useSelection();

  const {
    data: { groups },
  } = useGridData();

  const task = getTask({ taskId, task: groups });

  return (
    <Box height="50%">
      <Text as="strong">任务耗时</Text>
      <TaskDuration />
      <Text as="strong">任务详情</Text>
      <Table variant="striped" my={5}>
        <Tbody>
          <Tr>
            <Td>操作符</Td>
            <Td>{task?.operator}</Td>
          </Tr>
          <Tr>
            <Td>触发规则</Td>
            <Td>{task?.triggerRule}</Td>
          </Tr>
        </Tbody>
      </Table>
    </Box>
  );
};

export default TaskDetails;
