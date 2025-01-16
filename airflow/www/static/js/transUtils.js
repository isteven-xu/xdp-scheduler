export const tans_map_task = (value) =>{
    if (value.toLowerCase() === 'map index'){return "索引"}
    if (value.toLowerCase() === 'state'){return "状态"}
    if (value.toLowerCase() === 'duration'){return "耗时"}
    if (value.toLowerCase() === 'start date'){return "开始时间"}
    if (value.toLowerCase() === 'end date'){return "结束时间"}
    if (value.toLowerCase() === 'try number'){return "重试次数"}
}

export const tans_task_state = (value) =>{
    if ( value.toLowerCase() === 'queued') {return '队列中'}
    if ( value.toLowerCase() === 'success') {return '成功'}
    if ( value.toLowerCase() === 'running') {return '运行中'}
    if ( value.toLowerCase() === 'queued') {return '队列中'}
    if ( value.toLowerCase() === 'failed') {return '失败'}
    if ( value.toLowerCase() === 'deferred') {return '延迟'}
    if ( value.toLowerCase() === 'removed') {return '移除'}
    if ( value.toLowerCase() === 'restarting') {return '重试中'}
    if ( value.toLowerCase() === 'scheduled') {return '已调度'}
    if ( value.toLowerCase() === 'shutdown') {return '停止'}
    if ( value.toLowerCase() === 'skipped') {return '跳过'}
    if ( value.toLowerCase() === 'up_for_reschedule') {return '等待调度'}
    if ( value.toLowerCase() === 'up_for_retry') {return '等待重试'}
    if ( value.toLowerCase() === 'upstream_failed') {return '上游失败'}
    return "无状态"
}