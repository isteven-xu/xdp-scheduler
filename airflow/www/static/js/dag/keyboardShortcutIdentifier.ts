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

import type { KeyboardShortcutIdentifier } from "src/types";

const keyboardShortcutIdentifier: KeyboardShortcutIdentifier = {
  dagRunClear: {
    primaryKey: "shiftKey",
    secondaryKey: ["C", "c"],
    detail: "清除所选的流程运行及其所有现有任务",
  },
  dagMarkSuccess: {
    primaryKey: "shiftKey",
    secondaryKey: ["S", "s"],
    detail: "将所选的流程运行标记为成功",
  },
  dagMarkFailed: {
    primaryKey: "shiftKey",
    secondaryKey: ["F", "f"],
    detail: "将所选的流程运行标记为失败",
  },
  taskRunClear: {
    primaryKey: "shiftKey",
    secondaryKey: ["C", "c"],
    detail: "清除所选任务实例状态",
  },
  taskMarkSuccess: {
    primaryKey: "shiftKey",
    secondaryKey: ["S", "s"],
    detail: "为所选失败的任务实例打开标记为成功的弹窗",
  },
  taskMarkFailed: {
    primaryKey: "shiftKey",
    secondaryKey: ["F", "f"],
    detail:
      "为所选成功的任务实例打开标记为失败的弹窗",
  },
  viewNotes: {
    primaryKey: "shiftKey",
    secondaryKey: ["N", "n"],
    detail: "查看所选流程运行或任务实例的备注",
  },
  addOrEditNotes: {
    primaryKey: "shiftKey",
    secondaryKey: ["E", "e"],
    detail: "编辑所选流程运行或任务实例的备注",
  },
  toggleShortcutCheatSheet: {
    primaryKey: "shiftKey",
    secondaryKey: ["/", "?"],
    detail: "换快捷方式备忘单",
  },
};

export default keyboardShortcutIdentifier;
