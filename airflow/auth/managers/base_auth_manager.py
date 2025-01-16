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

from abc import abstractmethod
from functools import cached_property
from typing import TYPE_CHECKING, Container, Literal, Sequence

from flask_appbuilder.menu import MenuItem
from sqlalchemy import select

from airflow.auth.managers.models.resource_details import (
    DagDetails,
)
from airflow.exceptions import AirflowException
from airflow.models import DagModel
from airflow.security.permissions import ACTION_CAN_ACCESS_MENU
from airflow.utils.log.logging_mixin import LoggingMixin
from airflow.utils.session import NEW_SESSION, provide_session

if TYPE_CHECKING:
    from flask import Blueprint
    from sqlalchemy.orm import Session

    from airflow.auth.managers.models.base_user import BaseUser
    from airflow.auth.managers.models.batch_apis import (
        IsAuthorizedConnectionRequest,
        IsAuthorizedDagRequest,
        IsAuthorizedPoolRequest,
        IsAuthorizedVariableRequest,
    )
    from airflow.auth.managers.models.resource_details import (
        AccessView,
        ConfigurationDetails,
        ConnectionDetails,
        DagAccessEntity,
        DatasetDetails,
        PoolDetails,
        VariableDetails,
    )
    from airflow.cli.cli_config import CLICommand
    from airflow.www.extensions.init_appbuilder import AirflowAppBuilder
    from airflow.www.security_manager import AirflowSecurityManagerV2

ResourceMethod = Literal["GET", "POST", "PUT", "DELETE", "MENU"]


class BaseAuthManager(LoggingMixin):
    """
    Class to derive in order to implement concrete auth managers.

    Auth managers are responsible for any user management related operation such as login, logout, authz, ...

    :param appbuilder: the flask app builder
    """

    def __init__(self, appbuilder: AirflowAppBuilder) -> None:
        super().__init__()
        self.appbuilder = appbuilder

    @staticmethod
    def get_cli_commands() -> list[CLICommand]:
        """
        Vends CLI commands to be included in Airflow CLI.

        Override this method to expose commands via Airflow CLI to manage this auth manager.
        """
        return []

    def get_api_endpoints(self) -> None | Blueprint:
        """Return API endpoint(s) definition for the auth manager."""
        return None

    def get_user_name(self) -> str:
        """Return the username associated to the user in session."""
        user = self.get_user()
        if not user:
            self.log.error("Calling 'get_user_name()' but the user is not signed in.")
            raise AirflowException("The user must be signed in.")
        return user.get_name()

    def get_user_display_name(self) -> str:
        """Return the user's display name associated to the user in session."""
        return self.get_user_name()

    @abstractmethod
    def get_user(self) -> BaseUser | None:
        """Return the user associated to the user in session."""

    def get_user_id(self) -> str | None:
        """Return the user ID associated to the user in session."""
        user = self.get_user()
        if not user:
            self.log.error("Calling 'get_user_id()' but the user is not signed in.")
            raise AirflowException("The user must be signed in.")
        if user_id := user.get_id():
            return str(user_id)
        return None

    def init(self) -> None:
        """
        Run operations when Airflow is initializing.

        By default, do nothing.
        """

    @abstractmethod
    def is_logged_in(self) -> bool:
        """Return whether the user is logged in."""

    @abstractmethod
    def is_authorized_configuration(
        self,
        *,
        method: ResourceMethod,
        details: ConfigurationDetails | None = None,
        user: BaseUser | None = None,
    ) -> bool:
        """
        Return whether the user is authorized to perform a given action on configuration.

        :param method: the method to perform
        :param details: optional details about the configuration
        :param user: the user to perform the action on. If not provided (or None), it uses the current user
        """

    @abstractmethod
    def is_authorized_connection(
        self,
        *,
        method: ResourceMethod,
        details: ConnectionDetails | None = None,
        user: BaseUser | None = None,
    ) -> bool:
        """
        Return whether the user is authorized to perform a given action on a connection.

        :param method: the method to perform
        :param details: optional details about the connection
        :param user: the user to perform the action on. If not provided (or None), it uses the current user
        """

    @abstractmethod
    def is_authorized_dag(
        self,
        *,
        method: ResourceMethod,
        access_entity: DagAccessEntity | None = None,
        details: DagDetails | None = None,
        user: BaseUser | None = None,
    ) -> bool:
        """
        Return whether the user is authorized to perform a given action on a DAG.

        :param method: the method to perform
        :param access_entity: the kind of DAG information the authorization request is about.
            If not provided, the authorization request is about the DAG itself
        :param details: optional details about the DAG
        :param user: the user to perform the action on. If not provided (or None), it uses the current user
        """

    @abstractmethod
    def is_authorized_dataset(
        self,
        *,
        method: ResourceMethod,
        details: DatasetDetails | None = None,
        user: BaseUser | None = None,
    ) -> bool:
        """
        Return whether the user is authorized to perform a given action on a dataset.

        :param method: the method to perform
        :param details: optional details about the dataset
        :param user: the user to perform the action on. If not provided (or None), it uses the current user
        """

    @abstractmethod
    def is_authorized_pool(
        self,
        *,
        method: ResourceMethod,
        details: PoolDetails | None = None,
        user: BaseUser | None = None,
    ) -> bool:
        """
        Return whether the user is authorized to perform a given action on a pool.

        :param method: the method to perform
        :param details: optional details about the pool
        :param user: the user to perform the action on. If not provided (or None), it uses the current user
        """

    @abstractmethod
    def is_authorized_variable(
        self,
        *,
        method: ResourceMethod,
        details: VariableDetails | None = None,
        user: BaseUser | None = None,
    ) -> bool:
        """
        Return whether the user is authorized to perform a given action on a variable.

        :param method: the method to perform
        :param details: optional details about the variable
        :param user: the user to perform the action on. If not provided (or None), it uses the current user
        """

    @abstractmethod
    def is_authorized_view(
        self,
        *,
        access_view: AccessView,
        user: BaseUser | None = None,
    ) -> bool:
        """
        Return whether the user is authorized to access a read-only state of the installation.

        :param access_view: the specific read-only view/state the authorization request is about.
        :param user: the user to perform the action on. If not provided (or None), it uses the current user
        """

    @abstractmethod
    def is_authorized_custom_view(
        self, *, method: ResourceMethod | str, resource_name: str, user: BaseUser | None = None
    ):
        """
        Return whether the user is authorized to perform a given action on a custom view.

        A custom view can be a view defined as part of the auth manager. This view is then only available when
        the auth manager is used as part of the environment. It can also be a view defined as part of a
        plugin defined by a user.

        :param method: the method to perform.
            The method can also be a string if the action has been defined in a plugin.
            In that case, the action can be anything (e.g. can_do).
            See https://github.com/apache/airflow/issues/39144
        :param resource_name: the name of the resource
        :param user: the user to perform the action on. If not provided (or None), it uses the current user
        """

    def batch_is_authorized_connection(
        self,
        requests: Sequence[IsAuthorizedConnectionRequest],
    ) -> bool:
        """
        Batch version of ``is_authorized_connection``.

        By default, calls individually the ``is_authorized_connection`` API on each item in the list of
        requests, which can lead to some poor performance. It is recommended to override this method in the auth
        manager implementation to provide a more efficient implementation.

        :param requests: a list of requests containing the parameters for ``is_authorized_connection``
        """
        return all(
            self.is_authorized_connection(method=request["method"], details=request.get("details"))
            for request in requests
        )

    def batch_is_authorized_dag(
        self,
        requests: Sequence[IsAuthorizedDagRequest],
    ) -> bool:
        """
        Batch version of ``is_authorized_dag``.

        By default, calls individually the ``is_authorized_dag`` API on each item in the list of requests.
        Can lead to some poor performance. It is recommended to override this method in the auth manager
        implementation to provide a more efficient implementation.

        :param requests: a list of requests containing the parameters for ``is_authorized_dag``
        """
        return all(
            self.is_authorized_dag(
                method=request["method"],
                access_entity=request.get("access_entity"),
                details=request.get("details"),
            )
            for request in requests
        )

    def batch_is_authorized_pool(
        self,
        requests: Sequence[IsAuthorizedPoolRequest],
    ) -> bool:
        """
        Batch version of ``is_authorized_pool``.

        By default, calls individually the ``is_authorized_pool`` API on each item in the list of
        requests. Can lead to some poor performance. It is recommended to override this method in the auth
        manager implementation to provide a more efficient implementation.

        :param requests: a list of requests containing the parameters for ``is_authorized_pool``
        """
        return all(
            self.is_authorized_pool(method=request["method"], details=request.get("details"))
            for request in requests
        )

    def batch_is_authorized_variable(
        self,
        requests: Sequence[IsAuthorizedVariableRequest],
    ) -> bool:
        """
        Batch version of ``is_authorized_variable``.

        By default, calls individually the ``is_authorized_variable`` API on each item in the list of
        requests. Can lead to some poor performance. It is recommended to override this method in the auth
        manager implementation to provide a more efficient implementation.

        :param requests: a list of requests containing the parameters for ``is_authorized_variable``
        """
        return all(
            self.is_authorized_variable(method=request["method"], details=request.get("details"))
            for request in requests
        )

    @provide_session
    def get_permitted_dag_ids(
        self,
        *,
        methods: Container[ResourceMethod] | None = None,
        user=None,
        session: Session = NEW_SESSION,
    ) -> set[str]:
        """
        Get readable or writable DAGs for user.

        By default, reads all the DAGs and check individually if the user has permissions to access the DAG.
        Can lead to some poor performance. It is recommended to override this method in the auth manager
        implementation to provide a more efficient implementation.

        :param methods: whether filter readable or writable
        :param user: the current user
        :param session: the session
        """
        dag_ids = {dag.dag_id for dag in session.execute(select(DagModel.dag_id))}
        return self.filter_permitted_dag_ids(dag_ids=dag_ids, methods=methods, user=user)

    def filter_permitted_dag_ids(
        self,
        *,
        dag_ids: set[str],
        methods: Container[ResourceMethod] | None = None,
        user=None,
    ):
        """
        Filter readable or writable DAGs for user.

        :param dag_ids: the list of DAG ids
        :param methods: whether filter readable or writable
        :param user: the current user
        """
        if not methods:
            methods = ["PUT", "GET"]

        if ("GET" in methods and self.is_authorized_dag(method="GET", user=user)) or (
            "PUT" in methods and self.is_authorized_dag(method="PUT", user=user)
        ):
            # If user is authorized to read/edit all DAGs, return all DAGs
            return dag_ids

        def _is_permitted_dag_id(method: ResourceMethod, methods: Container[ResourceMethod], dag_id: str):
            return method in methods and self.is_authorized_dag(
                method=method, details=DagDetails(id=dag_id), user=user
            )

        return {
            dag_id
            for dag_id in dag_ids
            if _is_permitted_dag_id("GET", methods, dag_id) or _is_permitted_dag_id("PUT", methods, dag_id)
        }

    def filter_permitted_menu_items(self, menu_items: list[MenuItem]) -> list[MenuItem]:
        """
        Filter menu items based on user permissions.

        :param menu_items: list of all menu items
        """

        def _translate(item):
            if item.label == 'Actions': item.label= '权限动作';
            if item.label == 'Admin': item.label ='系统管理';
            if item.label == 'Airflow': item.label ='数据流程管理平台';
            if item.label == 'Audit Logs': item.label= '审计日志';
            if item.label == 'AuthDBView': item.label= '数据认证视图';
            if item.label == 'AutocompleteView': item.label= '自动完成视图';
            if item.label == 'Browse': item.label= '运维管理';
            if item.label == 'Cluster Activity': item.label= '集群管理';
            if item.label == 'Configurations': item.label= '系统配置';
            if item.label == 'Connections': item.label= '连接配置';
            if item.label == 'DAG Code': item.label= '流程代码';
            if item.label == 'DAG Dependencies': item.label= '流程描述';
            if item.label == 'DAG Runs': item.label= '流程实例';
            if item.label == 'DAG Warnings': item.label= '流程告警';
            if item.label == 'DAGs': item.label= '流程管理';
            if item.label == 'DagDependenciesView': item.label= '流程依赖视图';
            if item.label == 'Datasets': item.label= '数据集管理';
            if item.label == 'DevView': item.label= '开发视图';
            if item.label == 'Docs': item.label= '文档';
            if item.label == 'DocsView': item.label= '文档视图';
            if item.label == 'Documentation': item.label= '文档';
            if item.label == 'ImportError': item.label= '导入失败';
            if item.label == 'IndexView': item.label= '首页视图';
            if item.label == 'Jobs': item.label= '作业';
            if item.label == 'List Roles': item.label= '角色列表';
            if item.label == 'List Users': item.label= '用户列表';
            if item.label == 'LocaleView': item.label= '本地视图';
            if item.label == 'My Password': item.label= '我的密码';
            if item.label == 'My Profile': item.label= '我的信息';
            if item.label == 'Passwords': item.label= '密码';
            if item.label == 'Permission Pairs': item.label= '权限关系';
            if item.label == 'Permission Views': item.label= '权限视图';
            if item.label == 'Permissions': item.label= '权限';
            if item.label == 'Plugins': item.label= '插件';
            if item.label == 'Pools': item.label= '资源池';
            if item.label == 'Providers': item.label= '插件实例';
            if item.label == 'RedocView': item.label= 'Redoc视图';
            if item.label == 'Resources': item.label= '资源';
            if item.label == 'Roles': item.label= '角色';
            if item.label == 'SLA Misses': item.label= 'SLA';
            if item.label == 'Security': item.label= '安全管理';
            if item.label == 'Task Instances': item.label= '任务实例';
            if item.label == 'Task Logs': item.label= '任务日志';
            if item.label == 'Task Reschedules': item.label= '任务重新调度';
            if item.label == 'Triggers': item.label= '触发器';
            if item.label == 'User Stats Chart': item.label= '用户状态表';
            if item.label == "User's Statistics": item.label= '用户统计数据';
            if item.label == 'Users': item.label= '用户';
            if item.label == 'UtilView': item.label= '工具视图';
            if item.label == 'Variables': item.label= '变量配置';
            if item.label == 'View Menus': item.label= '视图菜单';
            if item.label == 'Website': item.label= '网站';
            if item.label == 'XComs': item.label= 'XComs';
            return item

        items = filter(
            lambda item: self.security_manager.has_access(ACTION_CAN_ACCESS_MENU, item.name), menu_items
        )
        accessible_items = []
        for menu_item in items:
            menu_item_copy = MenuItem(
                **{
                    **menu_item.__dict__,
                    "childs": [],
                }
            )
            if menu_item.childs:
                accessible_children = []
                for child in menu_item.childs:
                    if self.security_manager.has_access(ACTION_CAN_ACCESS_MENU, child.name):
                        accessible_children.append(child)
                menu_item_copy.childs = list(map(lambda x : _translate(x),[x for x in accessible_children if str(x.name) not in ("User's Statistics") ]))
            accessible_items.append(menu_item_copy)
        return list(map(lambda x : _translate(x),filter(lambda x: x.label not in ('Docs','Cluster Activity') ,accessible_items)))

    @abstractmethod
    def get_url_login(self, **kwargs) -> str:
        """Return the login page url."""

    @abstractmethod
    def get_url_logout(self) -> str:
        """Return the logout page url."""

    def get_url_user_profile(self) -> str | None:
        """
        Return the url to a page displaying info about the current user.

        By default, return None.
        """
        return None

    @cached_property
    def security_manager(self) -> AirflowSecurityManagerV2:
        """
        Return the security manager.

        By default, Airflow comes with the default security manager
        ``airflow.www.security_manager.AirflowSecurityManagerV2``. The auth manager might need to extend this
        default security manager for its own purposes.

        By default, return the default AirflowSecurityManagerV2.
        """
        from airflow.www.security_manager import AirflowSecurityManagerV2

        return AirflowSecurityManagerV2(self.appbuilder)
