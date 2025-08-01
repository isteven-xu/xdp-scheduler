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

import React, { useMemo, useRef, useState } from "react";
import {
  Box,
  Flex,
  FormControl,
  FormLabel,
  SimpleGrid,
  RadioGroup,
  Stack,
  Radio,
  IconButton,
} from "@chakra-ui/react";
import { createColumnHelper } from "@tanstack/react-table";
import { snakeCase } from "lodash";

import {
  OptionBase,
  useChakraSelectProps,
  CreatableSelect,
  GroupBase,
  ChakraStylesConfig,
} from "chakra-react-select";

import { useEventLogs } from "src/api";
import { getMetaValue, useOffsetTop } from "src/utils";
import type { DagRun } from "src/types";
import LinkButton from "src/components/LinkButton";
import type { EventLog as EventLogType } from "src/types/api-generated";
import { NewTable } from "src/components/NewTable/NewTable";
import { useTableURLState } from "src/components/NewTable/useTableUrlState";
import { CodeCell, TimeCell } from "src/components/NewTable/NewCells";
import { MdRefresh } from "react-icons/md";
import { useTimezone } from "src/context/timezone";
import { isoFormatWithoutTZ } from "src/datetime_utils";
import DateTimeInput from "src/components/DateTimeInput";

const configExcludedEvents = getMetaValue("excluded_audit_log_events");
const configIncludedEvents = getMetaValue("included_audit_log_events");

interface Props {
  taskId?: string;
  showMapped?: boolean;
  run?: DagRun;
}

interface Option extends OptionBase {
  label: string;
  value: string;
}

const dagId = getMetaValue("dag_id") || undefined;

const columnHelper = createColumnHelper<EventLogType>();

const EventLog = ({ taskId, run, showMapped }: Props) => {
  const logRef = useRef<HTMLDivElement>(null);
  const offsetTop = useOffsetTop(logRef);
  const { tableURLState, setTableURLState } = useTableURLState({
    sorting: [{ id: "when", desc: true }],
  });
  const includedEvents = configIncludedEvents.length
    ? configIncludedEvents.split(",")
    : [];
  const excludedEvents = configExcludedEvents.length
    ? configExcludedEvents.split(",")
    : [];

  let defaultEventFilter = "include";
  let defaultEvents = includedEvents;
  if (!includedEvents.length && excludedEvents.length) {
    defaultEventFilter = "exclude";
    defaultEvents = excludedEvents;
  }
  const [eventFilter, setEventFilter] = useState(defaultEventFilter);
  const [events, setEvents] = useState(defaultEvents);
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");

  const sort = tableURLState.sorting[0];
  const orderBy = sort ? `${sort.desc ? "-" : ""}${snakeCase(sort.id)}` : "";

  const { timezone } = useTimezone();

  // @ts-ignore
  const beforeTime = moment(before).tz(timezone).format(isoFormatWithoutTZ);
  // @ts-ignore
  const afterTime = moment(after).tz(timezone).format(isoFormatWithoutTZ);

  const { data, isLoading, isFetching, refetch } = useEventLogs({
    dagId,
    taskId,
    runId: run?.runId || undefined,
    // @ts-ignore
    before: before ? moment(before).format() : undefined,
    // @ts-ignore
    after: after ? moment(after).format() : undefined,
    orderBy,
    limit: tableURLState.pagination.pageSize,
    offset:
      tableURLState.pagination.pageIndex * tableURLState.pagination.pageSize,
    includedEvents:
      eventFilter === "include" && events ? events.join(",") : undefined,
    excludedEvents:
      eventFilter === "exclude" && events ? events.join(",") : undefined,
  });

  const columns = useMemo(() => {
    const when = columnHelper.accessor("when", {
      header: "时间",
      cell: TimeCell,
    });
    const task = columnHelper.accessor("taskId", {
      header: "任务ID",
      meta: {
        skeletonWidth: 20,
      },
    });
    const runId = columnHelper.accessor("runId", {
      header: "实例ID",
    });

    const mapIndex = columnHelper.accessor("mapIndex", {
      header: "索引",
      enableSorting: false,
      meta: {
        skeletonWidth: 10,
      },
      cell: (props) => (props.getValue() === -1 ? undefined : props.getValue()),
    });
    const rest = [
      columnHelper.accessor("tryNumber", {
        header: "重试次数",
        enableSorting: false,
        meta: {
          skeletonWidth: 10,
        },
      }),
      columnHelper.accessor("event", {
        header: "事件",
        meta: {
          skeletonWidth: 40,
        },
      }),
      columnHelper.accessor("owner", {
        header: "用户",
        meta: {
          skeletonWidth: 20,
        },
      }),
      columnHelper.accessor("extra", {
        header: "详情",
        cell: CodeCell,
      }),
    ];
    return [
      when,
      ...(!run ? [runId] : []),
      ...(!taskId ? [task] : []),
      ...(showMapped ? [mapIndex] : []),
      ...rest,
    ];
  }, [taskId, run, showMapped]);

  const memoData = useMemo(() => data?.eventLogs, [data?.eventLogs]);

  const chakraStyles: ChakraStylesConfig<Option, true, GroupBase<Option>> = {
    dropdownIndicator: (provided) => ({
      ...provided,
      display: "none",
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      display: "none",
    }),
    menuList: (provided) => ({
      ...provided,
      py: 0,
    }),
  };

  const eventsSelectProps = useChakraSelectProps<Option, true>({
    isMulti: true,
    noOptionsMessage: () => "Type to add new event",
    tagVariant: "solid",
    value: events.map((e) => ({
      label: e,
      value: e,
    })),
    onChange: (options) => {
      setEvents((options || []).map(({ value }) => value));
    },
    chakraStyles,
  });

  return (
    <Box
      height="100%"
      maxHeight={`calc(100% - ${offsetTop}px)`}
      ref={logRef}
      overflowY="auto"
    >
      <Flex justifyContent="right" mb={2}>
        <IconButton
          aria-label="Refresh"
          icon={<MdRefresh />}
          onClick={() => refetch()}
          variant="outline"
          colorScheme="blue"
          mr={2}
        />
        <LinkButton href={getMetaValue("audit_log_url")}>
          查看完整事件日志
        </LinkButton>
      </Flex>
      <SimpleGrid columns={4} columnGap={2}>
        <FormControl>
          <FormLabel>显示之后日志</FormLabel>
          <DateTimeInput
            value={afterTime}
            onChange={(e) => setAfter(e.target.value)}
          />
        </FormControl>
        <FormControl>
          <FormLabel>显示之前日志</FormLabel>
          <DateTimeInput
            value={beforeTime}
            onChange={(e) => setBefore(e.target.value)}
          />
        </FormControl>
        <FormControl>
          <FormLabel display="flex" alignItems="center">
            事件:
            <RadioGroup
              onChange={setEventFilter}
              value={eventFilter}
              display="inline-flex"
              ml={2}
            >
              <Stack direction="row">
                <Radio value="include">包含</Radio>
                <Radio value="exclude">不包含</Radio>
              </Stack>
            </RadioGroup>
          </FormLabel>
          <CreatableSelect {...eventsSelectProps} />
        </FormControl>
      </SimpleGrid>
      <NewTable
        key={`${taskId}-${run?.runId}`}
        data={memoData || []}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        initialState={tableURLState}
        onStateChange={setTableURLState}
        resultCount={data?.totalEntries}
      />
    </Box>
  );
};

export default EventLog;
