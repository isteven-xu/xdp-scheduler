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
import { Flex, Box, Table, Tbody, Tr, Td, Text } from "@chakra-ui/react";

import type { DagRun as DagRunType } from "src/types";
import { SimpleStatus } from "src/dag/StatusBox";
import { ClipboardText } from "src/components/Clipboard";
import { formatDuration, getDuration } from "src/datetime_utils";
import Time from "src/components/Time";
import RunTypeIcon from "src/components/RunTypeIcon";
import RenderedJsonField from "src/components/RenderedJsonField";

interface Props {
  run: DagRunType;
}

const DagRunDetails = ({ run }: Props) => {
  if (!run) return null;
  const {
    state,
    runType,
    lastSchedulingDecision,
    dataIntervalStart,
    dataIntervalEnd,
    startDate,
    endDate,
    queuedAt,
    externalTrigger,
    conf,
  } = run;

  return (
    <Box mt={3} flexGrow={1}>
      <Text as="strong" mb={3}>
        运行实例详情
      </Text>
      <Table variant="striped">
        <Tbody>
          <Tr>
            <Td>状态</Td>
            <Td>
              <Flex>
                <SimpleStatus state={state} mx={2} />
                {state || "no status"}
              </Flex>
            </Td>
          </Tr>
          <Tr>
            <Td>实例ID</Td>
            <Td>
              <ClipboardText value={run.runId} />
            </Td>
          </Tr>
          <Tr>
            <Td>类型</Td>
            <Td>
              <RunTypeIcon runType={runType} />
              {runType}
            </Td>
          </Tr>
          {startDate && (
            <Tr>
              <Td>耗时</Td>
              <Td>{formatDuration(getDuration(startDate, endDate))}</Td>
            </Tr>
          )}
          {lastSchedulingDecision && (
            <Tr>
              <Td>上次调度</Td>
              <Td>
                <Time dateTime={lastSchedulingDecision} />
              </Td>
            </Tr>
          )}
          {queuedAt && (
            <Tr>
              <Td>入队列时间</Td>
              <Td>
                <Time dateTime={queuedAt} />
              </Td>
            </Tr>
          )}
          {startDate && (
            <Tr>
              <Td>开始时间</Td>
              <Td>
                <Time dateTime={startDate} />
              </Td>
            </Tr>
          )}
          {endDate && (
            <Tr>
              <Td>结束时间</Td>
              <Td>
                <Time dateTime={endDate} />
              </Td>
            </Tr>
          )}
          {dataIntervalStart && dataIntervalEnd && (
            <>
              <Tr>
                <Td>区间开始时间</Td>
                <Td>
                  <Time dateTime={dataIntervalStart} />
                </Td>
              </Tr>
              <Tr>
                <Td>区间结束时间</Td>
                <Td>
                  <Time dateTime={dataIntervalEnd} />
                </Td>
              </Tr>
            </>
          )}
          <Tr>
            <Td>外部触发</Td>
            <Td>{externalTrigger ? "True" : "False"}</Td>
          </Tr>
          <Tr>
            <Td>配置</Td>
            <Td>
              <RenderedJsonField content={conf ?? "None"} />
            </Td>
          </Tr>
        </Tbody>
      </Table>
    </Box>
  );
};

export default DagRunDetails;
