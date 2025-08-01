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

import React, { useState, useMemo, useRef } from "react";
import { Flex, Box } from "@chakra-ui/react";
import { snakeCase } from "lodash";
import type { Row, SortingRule } from "react-table";

import { formatDuration, getDuration } from "src/datetime_utils";
import { useMappedInstances } from "src/api";
import { StatusWithNotes } from "src/dag/StatusBox";
import { Table, CellProps } from "src/components/Table";
import Time from "src/components/Time";
import { useOffsetTop } from "src/utils";

interface Props {
  dagId: string;
  runId: string;
  taskId: string;
  onRowClicked: (row: Row) => void;
}

const MappedInstances = ({ dagId, runId, taskId, onRowClicked }: Props) => {
  const mappedTasksRef = useRef<HTMLDivElement>(null);
  const offsetTop = useOffsetTop(mappedTasksRef);
  const limit = 25;
  const [offset, setOffset] = useState(0);
  const [sortBy, setSortBy] = useState<SortingRule<object>[]>([]);

  const sort = sortBy[0];

  const orderBy =
    sort && sort.id ? `${sort.desc ? "-" : ""}${snakeCase(sort.id)}` : "";

  const {
    data: { taskInstances = [], totalEntries = 0 } = {
      taskInstances: [],
      totalEntries: 0,
    },
    isLoading,
  } = useMappedInstances({
    dagId,
    dagRunId: runId,
    taskId,
    limit,
    offset,
    orderBy,
  });

  const data = useMemo(
    () =>
      taskInstances.map((mi) => ({
        ...mi,
        renderedMapIndex: mi.renderedMapIndex,
        state: (
          <Flex alignItems="center">
            <StatusWithNotes
              state={
                mi.state === undefined || mi.state === "none" ? null : mi.state
              }
              mx={2}
              containsNotes={!!mi.note}
            />
            {mi.state || "no status"}
          </Flex>
        ),
        duration:
          mi.duration && formatDuration(getDuration(mi.startDate, mi.endDate)),
        startDate: <Time dateTime={mi.startDate} />,
        endDate: <Time dateTime={mi.endDate} />,
      })),
    [taskInstances]
  );

  const columns = useMemo(
    () => [
      {
        Header: "索引",
        accessor: "mapIndex",
        Cell: ({
          cell: {
            row: { original },
          },
        }: CellProps) => original.renderedMapIndex || original.mapIndex,
      },
      {
        Header: "状态",
        accessor: "state",
      },
      {
        Header: "耗时",
        accessor: "duration",
      },
      {
        Header: "开始时间",
        accessor: "startDate",
      },
      {
        Header: "结束时间",
        accessor: "endDate",
      },
      {
        Header: "重试次数",
        accessor: "tryNumber",
        disableSortBy: true,
      },
    ],
    []
  );

  return (
    <Box
      ref={mappedTasksRef}
      maxHeight={`calc(100% - ${offsetTop}px)`}
      overflowY="auto"
    >
      <Table
        data={data}
        columns={columns}
        manualPagination={{
          offset,
          setOffset,
          totalEntries,
        }}
        pageSize={limit}
        manualSort={{
          setSortBy,
          sortBy,
        }}
        isLoading={isLoading}
        onRowClicked={onRowClicked}
      />
    </Box>
  );
};

export default MappedInstances;
