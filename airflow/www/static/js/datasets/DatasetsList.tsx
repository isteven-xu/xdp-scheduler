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

import React, { useMemo, useState } from "react";
import { Box, Flex, Text, Link, ButtonGroup, Button } from "@chakra-ui/react";
import { snakeCase } from "lodash";
import type { Row, SortingRule } from "react-table";
import { useSearchParams } from "react-router-dom";

import { useDatasetsSummary } from "src/api";
import { CellProps, Table, TimeCell } from "src/components/Table";
import type { API } from "src/types";
import { getMetaValue } from "src/utils";
import type { DateOption } from "src/api/useDatasetsSummary";

import type { OnSelectProps } from "./types";

interface Props {
  onSelect: (props: OnSelectProps) => void;
}

const DetailCell = ({ cell: { row } }: CellProps) => {
  const { totalUpdates, uri } = row.original;
  return (
    <Box data-testid="dataset-list-item">
      <Text>{uri}</Text>
      <Text fontSize="sm" mt={2}>
        总更新: {totalUpdates}
      </Text>
    </Box>
  );
};

const DATE_FILTER_PARAM = "updated_within";

const dateOptions: Record<string, DateOption> = {
  month: { count: 30, unit: "days" },
  week: { count: 7, unit: "days" },
  day: { count: 24, unit: "hours" },
  hour: { count: 1, unit: "hour" },
};

const DatasetsList = ({ onSelect }: Props) => {
  const limit = 25;
  const [offset, setOffset] = useState(0);

  const [searchParams, setSearchParams] = useSearchParams();

  const dateFilter = searchParams.get(DATE_FILTER_PARAM) || undefined;

  const [sortBy, setSortBy] = useState<SortingRule<object>[]>([
    { id: "lastDatasetUpdate", desc: true },
  ]);
  const sort = sortBy[0];
  const order = sort ? `${sort.desc ? "-" : ""}${snakeCase(sort.id)}` : "";

  const {
    data: { datasets, totalEntries },
    isLoading,
  } = useDatasetsSummary({
    limit,
    offset,
    order,
    updatedAfter: dateFilter ? dateOptions[dateFilter] : undefined,
  });

  const columns = useMemo(
    () => [
      {
        Header: "URI",
        accessor: "uri",
        Cell: DetailCell,
      },
      {
        Header: "最近更新",
        accessor: "lastDatasetUpdate",
        Cell: TimeCell,
      },
    ],
    []
  );

  const data = useMemo(() => datasets, [datasets]);
  const memoSort = useMemo(() => sortBy, [sortBy]);

  const onDatasetSelect = (row: Row<API.Dataset>) => {
    if (row.original.uri) onSelect({ uri: row.original.uri });
  };

  const docsUrl = getMetaValue("datasets_docs");

  return (
    <>
      {!datasets.length && !isLoading && !dateFilter && (
        <Text mb={4} data-testid="no-datasets-msg">
          看起来您还没有任何数据集。
        </Text>
      )}
      <Flex wrap="wrap" mb={2}>
        <Text mr={2}>筛选过去有更新的数据集:</Text>
        <ButtonGroup size="sm" isAttached variant="outline">
          <Button
            onClick={() => {
              searchParams.delete(DATE_FILTER_PARAM);
              setSearchParams(searchParams);
            }}
            variant={!dateFilter ? "solid" : "outline"}
            fontWeight={!dateFilter ? "bold" : "normal"}
          >
            整个时间范围
          </Button>
          {Object.keys(dateOptions).map((option) => {
            const filter = dateOptions[option];
            const isSelected = option === dateFilter;
            return (
              <Button
                key={option}
                onClick={() => {
                  if (isSelected) {
                    searchParams.delete(DATE_FILTER_PARAM);
                  } else {
                    searchParams.set(DATE_FILTER_PARAM, option);
                  }
                  setSearchParams(searchParams);
                }}
                variant={isSelected ? "solid" : "outline"}
                fontWeight={isSelected ? "bold" : "normal"}
              >
                {filter.count} {filter.unit.replace("days","天").replace("hours","小时").replace("hour","小时")}
              </Button>
            );
          })}
        </ButtonGroup>
      </Flex>
      <Box borderWidth={1} mt={2}>
        <Table
          data={data}
          columns={columns}
          isLoading={isLoading}
          manualPagination={{
            offset,
            setOffset,
            totalEntries,
          }}
          manualSort={{
            setSortBy,
            sortBy,
            initialSortBy: memoSort,
          }}
          pageSize={limit}
          onRowClicked={onDatasetSelect}
        />
      </Box>
    </>
  );
};

export default DatasetsList;
