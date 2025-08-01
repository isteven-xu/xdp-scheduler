#
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
from __future__ import annotations

from airflow.exceptions import AirflowException
from airflow.ti_deps.deps.base_ti_dep import BaseTIDep
from airflow.utils.session import provide_session


class ValidStateDep(BaseTIDep):
    """
    Ensures that the task instance's state is in a given set of valid states.

    :param valid_states: A list of valid states that a task instance can have to meet
        this dependency.
    :return: whether or not the task instance's state is valid
    """

    NAME = "实例状态"
    IGNORABLE = True

    def __init__(self, valid_states):
        super().__init__()

        if not valid_states:
            raise AirflowException("ValidStatesDep received an empty set of valid states.")
        self._valid_states = valid_states

    def __eq__(self, other):
        """Check if two task instance dependencies are equal by comparing their types and valid states."""
        return isinstance(self, type(other)) and self._valid_states == other._valid_states

    def __hash__(self):
        """Compute the hash value based on the type of the task instance dependency and its valid states."""
        return hash((type(self), tuple(self._valid_states)))

    @provide_session
    def _get_dep_statuses(self, ti, session, dep_context):
        if dep_context.ignore_ti_state:
            yield self._passing_status(reason="Context specified that state should be ignored.")
            return

        if ti.state in self._valid_states:
            yield self._passing_status(reason=f"Task state {ti.state} was valid.")
            return

        yield self._failing_status(reason=f"任务处于 '{ti.state}' 状态。")
