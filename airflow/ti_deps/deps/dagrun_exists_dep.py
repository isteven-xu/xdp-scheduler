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

from airflow.ti_deps.deps.base_ti_dep import BaseTIDep
from airflow.utils.session import provide_session
from airflow.utils.state import DagRunState


class DagrunRunningDep(BaseTIDep):
    """Determines whether a task's DagRun is in valid state."""

    NAME = "实例运行中"
    IGNORABLE = True

    @provide_session
    def _get_dep_statuses(self, ti, session, dep_context):
        dr = ti.get_dagrun(session)
        if dr.state != DagRunState.RUNNING:
            yield self._failing_status(
                reason=f"任务实例的流程运行实例并未处于 '运行中' 状态，而是处于状态 '{dr.state}'."
            )
