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

import React, { useState } from "react";
import {
  Flex,
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuButtonProps,
} from "@chakra-ui/react";
import { MdArrowDropDown } from "react-icons/md";
import { getMetaValue } from "src/utils";
import { useKeysPress } from "src/utils/useKeysPress";
import keyboardShortcutIdentifier from "src/dag/keyboardShortcutIdentifier";
import { useClearRun, useQueueRun } from "src/api";
import ConfirmationModal from "./ConfirmationModal";

const canEdit = getMetaValue("can_edit") === "True";
const dagId = getMetaValue("dag_id");

interface Props extends MenuButtonProps {
  runId: string;
}

const ClearRun = ({ runId, ...otherProps }: Props) => {
  const { mutateAsync: onClear, isLoading: isClearLoading } = useClearRun(
    dagId,
    runId
  );

  const { mutateAsync: onQueue, isLoading: isQueueLoading } = useQueueRun(
    dagId,
    runId
  );

  const clearExistingTasks = () => {
    onClear({ confirmed: true });
  };

  const clearFailedTasks = () => {
    onClear({ confirmed: true, only_failed: true });
  };

  const queueNewTasks = () => {
    onQueue({ confirmed: true });
  };

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const storedValue = localStorage.getItem("doNotShowClearRunModal");
  const [doNotShowAgain, setDoNotShowAgain] = useState(
    storedValue ? JSON.parse(storedValue) : false
  );

  const confirmAction = () => {
    localStorage.setItem(
      "doNotShowClearRunModal",
      JSON.stringify(doNotShowAgain)
    );
    clearExistingTasks();
    setShowConfirmationModal(false);
  };

  useKeysPress(keyboardShortcutIdentifier.dagRunClear, () => {
    if (!doNotShowAgain) {
      setShowConfirmationModal(true);
    } else clearExistingTasks();
  });

  const clearLabel = "Clear tasks or add new tasks";
  return (
    <>
      <Menu>
        <MenuButton
          as={Button}
          colorScheme="blue"
          transition="all 0.2s"
          title={clearLabel}
          aria-label={clearLabel}
          disabled={!canEdit || isClearLoading || isQueueLoading}
          {...otherProps}
          mt={2}
        >
          <Flex>
            重置状态
            <MdArrowDropDown size="16px" />
          </Flex>
        </MenuButton>
        <MenuList>
          <MenuItem onClick={clearExistingTasks}>重置所有任务</MenuItem>
          <MenuItem onClick={clearFailedTasks}>
            重置仅失败的任务
          </MenuItem>
          <MenuItem onClick={queueNewTasks}>将新任务加入队列</MenuItem>
        </MenuList>
      </Menu>
      <ConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        header="Confirmation"
        submitButton={
          <Button onClick={confirmAction} colorScheme="blue">
            重置运行实例
          </Button>
        }
        doNotShowAgain={doNotShowAgain}
        onDoNotShowAgainChange={(value) => setDoNotShowAgain(value)}
      >
        此运行实例将被重置。您确定要继续吗？
        {/*This DAG run will be cleared. Are you sure you want to proceed?*/}
      </ConfirmationModal>
    </>
  );
};

export default ClearRun;
