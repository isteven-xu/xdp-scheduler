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

import { useTimezone } from "src/context/timezone";
import { defaultFormatWithTZ } from "src/datetime_utils";

interface Props {
  dateTime?: string | null;
  format?: string;
}

const Time = ({ dateTime, format = defaultFormatWithTZ }: Props) => {
  const { timezone } = useTimezone();
  // @ts-ignore
  const time = moment(dateTime);

  if (!dateTime || !time.isValid()) return null;

  // @ts-ignore
  const formattedTime = time.tz(timezone).format(format);
  // @ts-ignore
  const utcTime = time.tz("UTC").format(defaultFormatWithTZ);

  return (
    <time
      dateTime={dateTime.replace("CST","")}
      // show title if date is not UTC
      // title={timezone.toUpperCase() !== "UTC" ? utcTime : undefined}
    >
      {formattedTime}
    </time>
  );
};

export default Time;
