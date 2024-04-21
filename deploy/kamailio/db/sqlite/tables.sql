CREATE TABLE version (
    id INTEGER PRIMARY KEY NOT NULL,
    table_name VARCHAR(32) NOT NULL,
    table_version INTEGER DEFAULT 0 NOT NULL,
    CONSTRAINT version_table_name_idx UNIQUE (table_name)
);

INSERT INTO version (table_name, table_version) values ('version','1');

CREATE TABLE acc (
    id INTEGER PRIMARY KEY NOT NULL,
    method VARCHAR(16) DEFAULT '' NOT NULL,
    from_tag VARCHAR(128) DEFAULT '' NOT NULL,
    to_tag VARCHAR(128) DEFAULT '' NOT NULL,
    callid VARCHAR(255) DEFAULT '' NOT NULL,
    sip_code VARCHAR(3) DEFAULT '' NOT NULL,
    sip_reason VARCHAR(128) DEFAULT '' NOT NULL,
    time TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

CREATE INDEX acc_callid_idx ON acc (callid);

INSERT INTO version (table_name, table_version) values ('acc','5');

CREATE TABLE acc_cdrs (
    id INTEGER PRIMARY KEY NOT NULL,
    start_time TIMESTAMP WITHOUT TIME ZONE DEFAULT '2000-01-01 00:00:00' NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE DEFAULT '2000-01-01 00:00:00' NOT NULL,
    duration REAL DEFAULT 0 NOT NULL
);

CREATE INDEX acc_cdrs_start_time_idx ON acc_cdrs (start_time);

INSERT INTO version (table_name, table_version) values ('acc_cdrs','2');

CREATE TABLE missed_calls (
    id INTEGER PRIMARY KEY NOT NULL,
    method VARCHAR(16) DEFAULT '' NOT NULL,
    from_tag VARCHAR(128) DEFAULT '' NOT NULL,
    to_tag VARCHAR(128) DEFAULT '' NOT NULL,
    callid VARCHAR(255) DEFAULT '' NOT NULL,
    sip_code VARCHAR(3) DEFAULT '' NOT NULL,
    sip_reason VARCHAR(128) DEFAULT '' NOT NULL,
    time TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

CREATE INDEX missed_calls_callid_idx ON missed_calls (callid);

INSERT INTO version (table_name, table_version) values ('missed_calls','4');

CREATE TABLE dbaliases (
    id INTEGER PRIMARY KEY NOT NULL,
    alias_username VARCHAR(64) DEFAULT '' NOT NULL,
    alias_domain VARCHAR(64) DEFAULT '' NOT NULL,
    username VARCHAR(64) DEFAULT '' NOT NULL,
    domain VARCHAR(64) DEFAULT '' NOT NULL
);

CREATE INDEX dbaliases_alias_user_idx ON dbaliases (alias_username);
CREATE INDEX dbaliases_alias_idx ON dbaliases (alias_username, alias_domain);
CREATE INDEX dbaliases_target_idx ON dbaliases (username, domain);

INSERT INTO version (table_name, table_version) values ('dbaliases','1');

CREATE TABLE subscriber (
    id INTEGER PRIMARY KEY NOT NULL,
    username VARCHAR(64) DEFAULT '' NOT NULL,
    domain VARCHAR(64) DEFAULT '' NOT NULL,
    password VARCHAR(64) DEFAULT '' NOT NULL,
    ha1 VARCHAR(128) DEFAULT '' NOT NULL,
    ha1b VARCHAR(128) DEFAULT '' NOT NULL,
    CONSTRAINT subscriber_account_idx UNIQUE (username, domain)
);

CREATE INDEX subscriber_username_idx ON subscriber (username);

INSERT INTO version (table_name, table_version) values ('subscriber','7');

CREATE TABLE usr_preferences (
    id INTEGER PRIMARY KEY NOT NULL,
    uuid VARCHAR(64) DEFAULT '' NOT NULL,
    username VARCHAR(255) DEFAULT 0 NOT NULL,
    domain VARCHAR(64) DEFAULT '' NOT NULL,
    attribute VARCHAR(32) DEFAULT '' NOT NULL,
    type INTEGER DEFAULT 0 NOT NULL,
    value VARCHAR(128) DEFAULT '' NOT NULL,
    last_modified TIMESTAMP WITHOUT TIME ZONE DEFAULT '2000-01-01 00:00:01' NOT NULL
);

CREATE INDEX usr_preferences_ua_idx ON usr_preferences (uuid, attribute);
CREATE INDEX usr_preferences_uda_idx ON usr_preferences (username, domain, attribute);

INSERT INTO version (table_name, table_version) values ('usr_preferences','2');

CREATE TABLE carrierroute (
    id INTEGER PRIMARY KEY NOT NULL,
    carrier INTEGER DEFAULT 0 NOT NULL,
    domain INTEGER DEFAULT 0 NOT NULL,
    scan_prefix VARCHAR(64) DEFAULT '' NOT NULL,
    flags INTEGER DEFAULT 0 NOT NULL,
    mask INTEGER DEFAULT 0 NOT NULL,
    prob REAL DEFAULT 0 NOT NULL,
    strip INTEGER DEFAULT 0 NOT NULL,
    rewrite_host VARCHAR(255) DEFAULT '' NOT NULL,
    rewrite_prefix VARCHAR(64) DEFAULT '' NOT NULL,
    rewrite_suffix VARCHAR(64) DEFAULT '' NOT NULL,
    description VARCHAR(255) DEFAULT NULL
);

INSERT INTO version (table_name, table_version) values ('carrierroute','3');

CREATE TABLE carrierfailureroute (
    id INTEGER PRIMARY KEY NOT NULL,
    carrier INTEGER DEFAULT 0 NOT NULL,
    domain INTEGER DEFAULT 0 NOT NULL,
    scan_prefix VARCHAR(64) DEFAULT '' NOT NULL,
    host_name VARCHAR(255) DEFAULT '' NOT NULL,
    reply_code VARCHAR(3) DEFAULT '' NOT NULL,
    flags INTEGER DEFAULT 0 NOT NULL,
    mask INTEGER DEFAULT 0 NOT NULL,
    next_domain INTEGER DEFAULT 0 NOT NULL,
    description VARCHAR(255) DEFAULT NULL
);

INSERT INTO version (table_name, table_version) values ('carrierfailureroute','2');

CREATE TABLE carrier_name (
    id INTEGER PRIMARY KEY NOT NULL,
    carrier VARCHAR(64) DEFAULT NULL
);

INSERT INTO version (table_name, table_version) values ('carrier_name','1');

CREATE TABLE domain_name (
    id INTEGER PRIMARY KEY NOT NULL,
    domain VARCHAR(64) DEFAULT NULL
);

INSERT INTO version (table_name, table_version) values ('domain_name','1');

CREATE TABLE cpl (
    id INTEGER PRIMARY KEY NOT NULL,
    username VARCHAR(64) NOT NULL,
    domain VARCHAR(64) DEFAULT '' NOT NULL,
    cpl_xml TEXT,
    cpl_bin TEXT,
    CONSTRAINT cpl_account_idx UNIQUE (username, domain)
);

INSERT INTO version (table_name, table_version) values ('cpl','1');

CREATE TABLE dialog (
    id INTEGER PRIMARY KEY NOT NULL,
    hash_entry INTEGER NOT NULL,
    hash_id INTEGER NOT NULL,
    callid VARCHAR(255) NOT NULL,
    from_uri VARCHAR(255) NOT NULL,
    from_tag VARCHAR(128) NOT NULL,
    to_uri VARCHAR(255) NOT NULL,
    to_tag VARCHAR(128) NOT NULL,
    caller_cseq VARCHAR(20) NOT NULL,
    callee_cseq VARCHAR(20) NOT NULL,
    caller_route_set VARCHAR(512),
    callee_route_set VARCHAR(512),
    caller_contact VARCHAR(255) NOT NULL,
    callee_contact VARCHAR(255) NOT NULL,
    caller_sock VARCHAR(64) NOT NULL,
    callee_sock VARCHAR(64) NOT NULL,
    state INTEGER NOT NULL,
    start_time INTEGER NOT NULL,
    timeout INTEGER DEFAULT 0 NOT NULL,
    sflags INTEGER DEFAULT 0 NOT NULL,
    iflags INTEGER DEFAULT 0 NOT NULL,
    toroute_name VARCHAR(32),
    req_uri VARCHAR(255) NOT NULL,
    xdata VARCHAR(512)
);

CREATE INDEX dialog_hash_idx ON dialog (hash_entry, hash_id);

INSERT INTO version (table_name, table_version) values ('dialog','7');

CREATE TABLE dialog_vars (
    id INTEGER PRIMARY KEY NOT NULL,
    hash_entry INTEGER NOT NULL,
    hash_id INTEGER NOT NULL,
    dialog_key VARCHAR(128) NOT NULL,
    dialog_value VARCHAR(512) NOT NULL
);

CREATE INDEX dialog_vars_hash_idx ON dialog_vars (hash_entry, hash_id);

INSERT INTO version (table_name, table_version) values ('dialog_vars','1');

CREATE TABLE dialplan (
    id INTEGER PRIMARY KEY NOT NULL,
    dpid INTEGER NOT NULL,
    pr INTEGER NOT NULL,
    match_op INTEGER NOT NULL,
    match_exp VARCHAR(64) NOT NULL,
    match_len INTEGER NOT NULL,
    subst_exp VARCHAR(64) NOT NULL,
    repl_exp VARCHAR(256) NOT NULL,
    attrs VARCHAR(64) NOT NULL
);

INSERT INTO version (table_name, table_version) values ('dialplan','2');

CREATE TABLE dispatcher (
    id INTEGER PRIMARY KEY NOT NULL,
    setid INTEGER DEFAULT 0 NOT NULL,
    destination VARCHAR(192) DEFAULT '' NOT NULL,
    flags INTEGER DEFAULT 0 NOT NULL,
    priority INTEGER DEFAULT 0 NOT NULL,
    attrs VARCHAR(128) DEFAULT '' NOT NULL,
    description VARCHAR(64) DEFAULT '' NOT NULL
);

INSERT INTO version (table_name, table_version) values ('dispatcher','4');

CREATE TABLE domain (
    id INTEGER PRIMARY KEY NOT NULL,
    domain VARCHAR(64) NOT NULL,
    did VARCHAR(64) DEFAULT NULL,
    last_modified TIMESTAMP WITHOUT TIME ZONE DEFAULT '2000-01-01 00:00:01' NOT NULL,
    CONSTRAINT domain_domain_idx UNIQUE (domain)
);

INSERT INTO version (table_name, table_version) values ('domain','2');

CREATE TABLE domain_attrs (
    id INTEGER PRIMARY KEY NOT NULL,
    did VARCHAR(64) NOT NULL,
    name VARCHAR(32) NOT NULL,
    type INTEGER NOT NULL,
    value VARCHAR(255) NOT NULL,
    last_modified TIMESTAMP WITHOUT TIME ZONE DEFAULT '2000-01-01 00:00:01' NOT NULL
);

CREATE INDEX domain_attrs_domain_attrs_idx ON domain_attrs (did, name);

INSERT INTO version (table_name, table_version) values ('domain_attrs','1');

CREATE TABLE domainpolicy (
    id INTEGER PRIMARY KEY NOT NULL,
    rule VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    att VARCHAR(255),
    val VARCHAR(128),
    description VARCHAR(255) NOT NULL,
    CONSTRAINT domainpolicy_rav_idx UNIQUE (rule, att, val)
);

CREATE INDEX domainpolicy_rule_idx ON domainpolicy (rule);

INSERT INTO version (table_name, table_version) values ('domainpolicy','2');

CREATE TABLE dr_gateways (
    gwid INTEGER PRIMARY KEY NOT NULL,
    type INTEGER DEFAULT 0 NOT NULL,
    address VARCHAR(128) NOT NULL,
    strip INTEGER DEFAULT 0 NOT NULL,
    pri_prefix VARCHAR(64) DEFAULT NULL,
    attrs VARCHAR(255) DEFAULT NULL,
    description VARCHAR(128) DEFAULT '' NOT NULL
);

INSERT INTO version (table_name, table_version) values ('dr_gateways','3');

CREATE TABLE dr_rules (
    ruleid INTEGER PRIMARY KEY NOT NULL,
    groupid VARCHAR(255) NOT NULL,
    prefix VARCHAR(64) NOT NULL,
    timerec VARCHAR(255) NOT NULL,
    priority INTEGER DEFAULT 0 NOT NULL,
    routeid VARCHAR(64) NOT NULL,
    gwlist VARCHAR(255) NOT NULL,
    description VARCHAR(128) DEFAULT '' NOT NULL
);

INSERT INTO version (table_name, table_version) values ('dr_rules','3');

CREATE TABLE dr_gw_lists (
    id INTEGER PRIMARY KEY NOT NULL,
    gwlist VARCHAR(255) NOT NULL,
    description VARCHAR(128) DEFAULT '' NOT NULL
);

INSERT INTO version (table_name, table_version) values ('dr_gw_lists','1');

CREATE TABLE dr_groups (
    id INTEGER PRIMARY KEY NOT NULL,
    username VARCHAR(64) NOT NULL,
    domain VARCHAR(128) DEFAULT '' NOT NULL,
    groupid INTEGER DEFAULT 0 NOT NULL,
    description VARCHAR(128) DEFAULT '' NOT NULL
);

INSERT INTO version (table_name, table_version) values ('dr_groups','2');

CREATE TABLE grp (
    id INTEGER PRIMARY KEY NOT NULL,
    username VARCHAR(64) DEFAULT '' NOT NULL,
    domain VARCHAR(64) DEFAULT '' NOT NULL,
    grp VARCHAR(64) DEFAULT '' NOT NULL,
    last_modified TIMESTAMP WITHOUT TIME ZONE DEFAULT '2000-01-01 00:00:01' NOT NULL,
    CONSTRAINT grp_account_group_idx UNIQUE (username, domain, grp)
);

INSERT INTO version (table_name, table_version) values ('grp','2');

CREATE TABLE re_grp (
    id INTEGER PRIMARY KEY NOT NULL,
    reg_exp VARCHAR(128) DEFAULT '' NOT NULL,
    group_id INTEGER DEFAULT 0 NOT NULL
);

CREATE INDEX re_grp_group_idx ON re_grp (group_id);

INSERT INTO version (table_name, table_version) values ('re_grp','1');

CREATE TABLE htable (
    id INTEGER PRIMARY KEY NOT NULL,
    key_name VARCHAR(64) DEFAULT '' NOT NULL,
    key_type INTEGER DEFAULT 0 NOT NULL,
    value_type INTEGER DEFAULT 0 NOT NULL,
    key_value VARCHAR(128) DEFAULT '' NOT NULL,
    expires INTEGER DEFAULT 0 NOT NULL
);

INSERT INTO version (table_name, table_version) values ('htable','2');

CREATE TABLE imc_rooms (
    id INTEGER PRIMARY KEY NOT NULL,
    name VARCHAR(64) NOT NULL,
    domain VARCHAR(64) NOT NULL,
    flag INTEGER NOT NULL,
    CONSTRAINT imc_rooms_name_domain_idx UNIQUE (name, domain)
);

INSERT INTO version (table_name, table_version) values ('imc_rooms','1');

CREATE TABLE imc_members (
    id INTEGER PRIMARY KEY NOT NULL,
    username VARCHAR(64) NOT NULL,
    domain VARCHAR(64) NOT NULL,
    room VARCHAR(64) NOT NULL,
    flag INTEGER NOT NULL,
    CONSTRAINT imc_members_account_room_idx UNIQUE (username, domain, room)
);

INSERT INTO version (table_name, table_version) values ('imc_members','1');

CREATE TABLE lcr_gw (
    id INTEGER PRIMARY KEY NOT NULL,
    lcr_id SMALLINT NOT NULL,
    gw_name VARCHAR(128),
    ip_addr VARCHAR(50),
    hostname VARCHAR(64),
    port SMALLINT,
    params VARCHAR(64),
    uri_scheme SMALLINT,
    transport SMALLINT,
    strip SMALLINT,
    prefix VARCHAR(16) DEFAULT NULL,
    tag VARCHAR(64) DEFAULT NULL,
    flags INTEGER DEFAULT 0 NOT NULL,
    defunct INTEGER DEFAULT NULL
);

CREATE INDEX lcr_gw_lcr_id_idx ON lcr_gw (lcr_id);

INSERT INTO version (table_name, table_version) values ('lcr_gw','3');

CREATE TABLE lcr_rule_target (
    id INTEGER PRIMARY KEY NOT NULL,
    lcr_id SMALLINT NOT NULL,
    rule_id INTEGER NOT NULL,
    gw_id INTEGER NOT NULL,
    priority SMALLINT NOT NULL,
    weight INTEGER DEFAULT 1 NOT NULL,
    CONSTRAINT lcr_rule_target_rule_id_gw_id_idx UNIQUE (rule_id, gw_id)
);

CREATE INDEX lcr_rule_target_lcr_id_idx ON lcr_rule_target (lcr_id);

INSERT INTO version (table_name, table_version) values ('lcr_rule_target','1');

CREATE TABLE lcr_rule (
    id INTEGER PRIMARY KEY NOT NULL,
    lcr_id SMALLINT NOT NULL,
    prefix VARCHAR(16) DEFAULT NULL,
    from_uri VARCHAR(64) DEFAULT NULL,
    request_uri VARCHAR(64) DEFAULT NULL,
    mt_tvalue VARCHAR(128) DEFAULT NULL,
    stopper INTEGER DEFAULT 0 NOT NULL,
    enabled INTEGER DEFAULT 1 NOT NULL,
    CONSTRAINT lcr_rule_lcr_id_prefix_from_uri_idx UNIQUE (lcr_id, prefix, from_uri)
);

INSERT INTO version (table_name, table_version) values ('lcr_rule','3');

CREATE TABLE matrix (
    id INTEGER PRIMARY KEY NOT NULL,
    first INTEGER NOT NULL,
    second SMALLINT NOT NULL,
    res INTEGER NOT NULL
);

CREATE INDEX matrix_matrix_idx ON matrix (first, second);

INSERT INTO version (table_name, table_version) values ('matrix','1');

CREATE TABLE mohqcalls (
    id INTEGER PRIMARY KEY NOT NULL,
    mohq_id INTEGER NOT NULL,
    call_id VARCHAR(100) NOT NULL,
    call_status INTEGER NOT NULL,
    call_from VARCHAR(100) NOT NULL,
    call_contact VARCHAR(100),
    call_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    CONSTRAINT mohqcalls_mohqcalls_idx UNIQUE (call_id)
);

INSERT INTO version (table_name, table_version) values ('mohqcalls','1');

CREATE TABLE mohqueues (
    id INTEGER PRIMARY KEY NOT NULL,
    name VARCHAR(25) NOT NULL,
    uri VARCHAR(100) NOT NULL,
    mohdir VARCHAR(100),
    mohfile VARCHAR(100) NOT NULL,
    debug INTEGER NOT NULL,
    CONSTRAINT mohqueues_mohqueue_uri_idx UNIQUE (uri),
    CONSTRAINT mohqueues_mohqueue_name_idx UNIQUE (name)
);

INSERT INTO version (table_name, table_version) values ('mohqueues','1');

CREATE TABLE silo (
    id INTEGER PRIMARY KEY NOT NULL,
    src_addr VARCHAR(255) DEFAULT '' NOT NULL,
    dst_addr VARCHAR(255) DEFAULT '' NOT NULL,
    username VARCHAR(64) DEFAULT '' NOT NULL,
    domain VARCHAR(64) DEFAULT '' NOT NULL,
    inc_time INTEGER DEFAULT 0 NOT NULL,
    exp_time INTEGER DEFAULT 0 NOT NULL,
    snd_time INTEGER DEFAULT 0 NOT NULL,
    ctype VARCHAR(32) DEFAULT 'text/plain' NOT NULL,
    body BLOB,
    extra_hdrs TEXT,
    callid VARCHAR(128) DEFAULT '' NOT NULL,
    status INTEGER DEFAULT 0 NOT NULL
);

CREATE INDEX silo_account_idx ON silo (username, domain);

INSERT INTO version (table_name, table_version) values ('silo','8');

CREATE TABLE mtree (
    id INTEGER PRIMARY KEY NOT NULL,
    tprefix VARCHAR(32) DEFAULT '' NOT NULL,
    tvalue VARCHAR(128) DEFAULT '' NOT NULL,
    CONSTRAINT mtree_tprefix_idx UNIQUE (tprefix)
);

INSERT INTO version (table_name, table_version) values ('mtree','1');

CREATE TABLE mtrees (
    id INTEGER PRIMARY KEY NOT NULL,
    tname VARCHAR(128) DEFAULT '' NOT NULL,
    tprefix VARCHAR(32) DEFAULT '' NOT NULL,
    tvalue VARCHAR(128) DEFAULT '' NOT NULL,
    CONSTRAINT mtrees_tname_tprefix_tvalue_idx UNIQUE (tname, tprefix, tvalue)
);

INSERT INTO version (table_name, table_version) values ('mtrees','2');

CREATE TABLE pdt (
    id INTEGER PRIMARY KEY NOT NULL,
    sdomain VARCHAR(255) NOT NULL,
    prefix VARCHAR(32) NOT NULL,
    domain VARCHAR(255) DEFAULT '' NOT NULL,
    CONSTRAINT pdt_sdomain_prefix_idx UNIQUE (sdomain, prefix)
);

INSERT INTO version (table_name, table_version) values ('pdt','1');

CREATE TABLE trusted (
    id INTEGER PRIMARY KEY NOT NULL,
    src_ip VARCHAR(50) NOT NULL,
    proto VARCHAR(4) NOT NULL,
    from_pattern VARCHAR(64) DEFAULT NULL,
    ruri_pattern VARCHAR(64) DEFAULT NULL,
    tag VARCHAR(64),
    priority INTEGER DEFAULT 0 NOT NULL
);

CREATE INDEX trusted_peer_idx ON trusted (src_ip);

INSERT INTO version (table_name, table_version) values ('trusted','6');

CREATE TABLE address (
    id INTEGER PRIMARY KEY NOT NULL,
    grp INTEGER DEFAULT 1 NOT NULL,
    ip_addr VARCHAR(50) NOT NULL,
    mask INTEGER DEFAULT 32 NOT NULL,
    port SMALLINT DEFAULT 0 NOT NULL,
    tag VARCHAR(64)
);

INSERT INTO version (table_name, table_version) values ('address','6');

CREATE TABLE pl_pipes (
    id INTEGER PRIMARY KEY NOT NULL,
    pipeid VARCHAR(64) DEFAULT '' NOT NULL,
    algorithm VARCHAR(32) DEFAULT '' NOT NULL,
    plimit INTEGER DEFAULT 0 NOT NULL
);

INSERT INTO version (table_name, table_version) values ('pl_pipes','1');

CREATE TABLE presentity (
    id INTEGER PRIMARY KEY NOT NULL,
    username VARCHAR(64) NOT NULL,
    domain VARCHAR(64) NOT NULL,
    event VARCHAR(64) NOT NULL,
    etag VARCHAR(128) NOT NULL,
    expires INTEGER NOT NULL,
    received_time INTEGER NOT NULL,
    body BLOB NOT NULL,
    sender VARCHAR(255) NOT NULL,
    priority INTEGER DEFAULT 0 NOT NULL,
    ruid VARCHAR(64),
    CONSTRAINT presentity_presentity_idx UNIQUE (username, domain, event, etag),
    CONSTRAINT presentity_ruid_idx UNIQUE (ruid)
);

CREATE INDEX presentity_presentity_expires ON presentity (expires);
CREATE INDEX presentity_account_idx ON presentity (username, domain, event);

INSERT INTO version (table_name, table_version) values ('presentity','5');

CREATE TABLE active_watchers (
    id INTEGER PRIMARY KEY NOT NULL,
    presentity_uri VARCHAR(255) NOT NULL,
    watcher_username VARCHAR(64) NOT NULL,
    watcher_domain VARCHAR(64) NOT NULL,
    to_user VARCHAR(64) NOT NULL,
    to_domain VARCHAR(64) NOT NULL,
    event VARCHAR(64) DEFAULT 'presence' NOT NULL,
    event_id VARCHAR(64),
    to_tag VARCHAR(128) NOT NULL,
    from_tag VARCHAR(128) NOT NULL,
    callid VARCHAR(255) NOT NULL,
    local_cseq INTEGER NOT NULL,
    remote_cseq INTEGER NOT NULL,
    contact VARCHAR(255) NOT NULL,
    record_route TEXT,
    expires INTEGER NOT NULL,
    status INTEGER DEFAULT 2 NOT NULL,
    reason VARCHAR(64),
    version INTEGER DEFAULT 0 NOT NULL,
    socket_info VARCHAR(64) NOT NULL,
    local_contact VARCHAR(255) NOT NULL,
    from_user VARCHAR(64) NOT NULL,
    from_domain VARCHAR(64) NOT NULL,
    updated INTEGER NOT NULL,
    updated_winfo INTEGER NOT NULL,
    flags INTEGER DEFAULT 0 NOT NULL,
    user_agent VARCHAR(255) DEFAULT '',
    CONSTRAINT active_watchers_active_watchers_idx UNIQUE (callid, to_tag, from_tag)
);

CREATE INDEX active_watchers_active_watchers_expires ON active_watchers (expires);
CREATE INDEX active_watchers_active_watchers_pres ON active_watchers (presentity_uri, event);
CREATE INDEX active_watchers_updated_idx ON active_watchers (updated);
CREATE INDEX active_watchers_updated_winfo_idx ON active_watchers (updated_winfo, presentity_uri);

INSERT INTO version (table_name, table_version) values ('active_watchers','12');

CREATE TABLE watchers (
    id INTEGER PRIMARY KEY NOT NULL,
    presentity_uri VARCHAR(255) NOT NULL,
    watcher_username VARCHAR(64) NOT NULL,
    watcher_domain VARCHAR(64) NOT NULL,
    event VARCHAR(64) DEFAULT 'presence' NOT NULL,
    status INTEGER NOT NULL,
    reason VARCHAR(64),
    inserted_time INTEGER NOT NULL,
    CONSTRAINT watchers_watcher_idx UNIQUE (presentity_uri, watcher_username, watcher_domain, event)
);

INSERT INTO version (table_name, table_version) values ('watchers','3');

CREATE TABLE xcap (
    id INTEGER PRIMARY KEY NOT NULL,
    username VARCHAR(64) NOT NULL,
    domain VARCHAR(64) NOT NULL,
    doc BLOB NOT NULL,
    doc_type INTEGER NOT NULL,
    etag VARCHAR(128) NOT NULL,
    source INTEGER NOT NULL,
    doc_uri VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    CONSTRAINT xcap_doc_uri_idx UNIQUE (doc_uri)
);

CREATE INDEX xcap_account_doc_type_idx ON xcap (username, domain, doc_type);
CREATE INDEX xcap_account_doc_type_uri_idx ON xcap (username, domain, doc_type, doc_uri);
CREATE INDEX xcap_account_doc_uri_idx ON xcap (username, domain, doc_uri);

INSERT INTO version (table_name, table_version) values ('xcap','4');

CREATE TABLE pua (
    id INTEGER PRIMARY KEY NOT NULL,
    pres_uri VARCHAR(255) NOT NULL,
    pres_id VARCHAR(255) NOT NULL,
    event INTEGER NOT NULL,
    expires INTEGER NOT NULL,
    desired_expires INTEGER NOT NULL,
    flag INTEGER NOT NULL,
    etag VARCHAR(128) NOT NULL,
    tuple_id VARCHAR(64),
    watcher_uri VARCHAR(255) NOT NULL,
    call_id VARCHAR(255) NOT NULL,
    to_tag VARCHAR(128) NOT NULL,
    from_tag VARCHAR(128) NOT NULL,
    cseq INTEGER NOT NULL,
    record_route TEXT,
    contact VARCHAR(255) NOT NULL,
    remote_contact VARCHAR(255) NOT NULL,
    version INTEGER NOT NULL,
    extra_headers TEXT NOT NULL,
    CONSTRAINT pua_pua_idx UNIQUE (etag, tuple_id, call_id, from_tag)
);

CREATE INDEX pua_expires_idx ON pua (expires);
CREATE INDEX pua_dialog1_idx ON pua (pres_id, pres_uri);
CREATE INDEX pua_dialog2_idx ON pua (call_id, from_tag);
CREATE INDEX pua_record_idx ON pua (pres_id);

INSERT INTO version (table_name, table_version) values ('pua','7');

CREATE TABLE purplemap (
    id INTEGER PRIMARY KEY NOT NULL,
    sip_user VARCHAR(255) NOT NULL,
    ext_user VARCHAR(255) NOT NULL,
    ext_prot VARCHAR(16) NOT NULL,
    ext_pass VARCHAR(64)
);

INSERT INTO version (table_name, table_version) values ('purplemap','1');

CREATE TABLE aliases (
    id INTEGER PRIMARY KEY NOT NULL,
    ruid VARCHAR(64) DEFAULT '' NOT NULL,
    username VARCHAR(64) DEFAULT '' NOT NULL,
    domain VARCHAR(64) DEFAULT NULL,
    contact VARCHAR(255) DEFAULT '' NOT NULL,
    received VARCHAR(255) DEFAULT NULL,
    path VARCHAR(512) DEFAULT NULL,
    expires TIMESTAMP WITHOUT TIME ZONE DEFAULT '2030-05-28 21:32:15' NOT NULL,
    q REAL DEFAULT 1.0 NOT NULL,
    callid VARCHAR(255) DEFAULT 'Default-Call-ID' NOT NULL,
    cseq INTEGER DEFAULT 1 NOT NULL,
    last_modified TIMESTAMP WITHOUT TIME ZONE DEFAULT '2000-01-01 00:00:01' NOT NULL,
    flags INTEGER DEFAULT 0 NOT NULL,
    cflags INTEGER DEFAULT 0 NOT NULL,
    user_agent VARCHAR(255) DEFAULT '' NOT NULL,
    socket VARCHAR(64) DEFAULT NULL,
    methods INTEGER DEFAULT NULL,
    instance VARCHAR(255) DEFAULT NULL,
    reg_id INTEGER DEFAULT 0 NOT NULL,
    server_id INTEGER DEFAULT 0 NOT NULL,
    connection_id INTEGER DEFAULT 0 NOT NULL,
    keepalive INTEGER DEFAULT 0 NOT NULL,
    partition INTEGER DEFAULT 0 NOT NULL,
    CONSTRAINT aliases_ruid_idx UNIQUE (ruid)
);

CREATE INDEX aliases_account_contact_idx ON aliases (username, domain, contact);
CREATE INDEX aliases_expires_idx ON aliases (expires);

INSERT INTO version (table_name, table_version) values ('aliases','8');

CREATE TABLE rls_presentity (
    id INTEGER PRIMARY KEY NOT NULL,
    rlsubs_did VARCHAR(255) NOT NULL,
    resource_uri VARCHAR(255) NOT NULL,
    content_type VARCHAR(255) NOT NULL,
    presence_state BLOB NOT NULL,
    expires INTEGER NOT NULL,
    updated INTEGER NOT NULL,
    auth_state INTEGER NOT NULL,
    reason VARCHAR(64) NOT NULL,
    CONSTRAINT rls_presentity_rls_presentity_idx UNIQUE (rlsubs_did, resource_uri)
);

CREATE INDEX rls_presentity_rlsubs_idx ON rls_presentity (rlsubs_did);
CREATE INDEX rls_presentity_updated_idx ON rls_presentity (updated);
CREATE INDEX rls_presentity_expires_idx ON rls_presentity (expires);

INSERT INTO version (table_name, table_version) values ('rls_presentity','1');

CREATE TABLE rls_watchers (
    id INTEGER PRIMARY KEY NOT NULL,
    presentity_uri VARCHAR(255) NOT NULL,
    to_user VARCHAR(64) NOT NULL,
    to_domain VARCHAR(64) NOT NULL,
    watcher_username VARCHAR(64) NOT NULL,
    watcher_domain VARCHAR(64) NOT NULL,
    event VARCHAR(64) DEFAULT 'presence' NOT NULL,
    event_id VARCHAR(64),
    to_tag VARCHAR(128) NOT NULL,
    from_tag VARCHAR(128) NOT NULL,
    callid VARCHAR(255) NOT NULL,
    local_cseq INTEGER NOT NULL,
    remote_cseq INTEGER NOT NULL,
    contact VARCHAR(255) NOT NULL,
    record_route TEXT,
    expires INTEGER NOT NULL,
    status INTEGER DEFAULT 2 NOT NULL,
    reason VARCHAR(64) NOT NULL,
    version INTEGER DEFAULT 0 NOT NULL,
    socket_info VARCHAR(64) NOT NULL,
    local_contact VARCHAR(255) NOT NULL,
    from_user VARCHAR(64) NOT NULL,
    from_domain VARCHAR(64) NOT NULL,
    updated INTEGER NOT NULL,
    CONSTRAINT rls_watchers_rls_watcher_idx UNIQUE (callid, to_tag, from_tag)
);

CREATE INDEX rls_watchers_rls_watchers_update ON rls_watchers (watcher_username, watcher_domain, event);
CREATE INDEX rls_watchers_rls_watchers_expires ON rls_watchers (expires);
CREATE INDEX rls_watchers_updated_idx ON rls_watchers (updated);

INSERT INTO version (table_name, table_version) values ('rls_watchers','3');

CREATE TABLE rtpengine (
    id INTEGER PRIMARY KEY NOT NULL,
    setid INTEGER DEFAULT 0 NOT NULL,
    url VARCHAR(64) NOT NULL,
    weight INTEGER DEFAULT 1 NOT NULL,
    disabled INTEGER DEFAULT 0 NOT NULL,
    stamp TIMESTAMP WITHOUT TIME ZONE DEFAULT '1900-01-01 00:00:01' NOT NULL,
    CONSTRAINT rtpengine_rtpengine_nodes UNIQUE (setid, url)
);

INSERT INTO version (table_name, table_version) values ('rtpengine','1');

CREATE TABLE rtpproxy (
    id INTEGER PRIMARY KEY NOT NULL,
    setid VARCHAR(32) DEFAULT 00 NOT NULL,
    url VARCHAR(64) DEFAULT '' NOT NULL,
    flags INTEGER DEFAULT 0 NOT NULL,
    weight INTEGER DEFAULT 1 NOT NULL,
    description VARCHAR(64) DEFAULT '' NOT NULL
);

INSERT INTO version (table_name, table_version) values ('rtpproxy','1');

CREATE TABLE sca_subscriptions (
    id INTEGER PRIMARY KEY NOT NULL,
    subscriber VARCHAR(255) NOT NULL,
    aor VARCHAR(255) NOT NULL,
    event INTEGER DEFAULT 0 NOT NULL,
    expires INTEGER DEFAULT 0 NOT NULL,
    state INTEGER DEFAULT 0 NOT NULL,
    app_idx INTEGER DEFAULT 0 NOT NULL,
    call_id VARCHAR(255) NOT NULL,
    from_tag VARCHAR(128) NOT NULL,
    to_tag VARCHAR(128) NOT NULL,
    record_route TEXT,
    notify_cseq INTEGER NOT NULL,
    subscribe_cseq INTEGER NOT NULL,
    server_id INTEGER DEFAULT 0 NOT NULL,
    CONSTRAINT sca_subscriptions_sca_subscriptions_idx UNIQUE (subscriber, call_id, from_tag, to_tag)
);

CREATE INDEX sca_subscriptions_sca_expires_idx ON sca_subscriptions (server_id, expires);
CREATE INDEX sca_subscriptions_sca_subscribers_idx ON sca_subscriptions (subscriber, event);

INSERT INTO version (table_name, table_version) values ('sca_subscriptions','2');

CREATE TABLE secfilter (
    id INTEGER PRIMARY KEY NOT NULL,
    action SMALLINT DEFAULT 0 NOT NULL,
    type SMALLINT DEFAULT 0 NOT NULL,
    data VARCHAR(64) DEFAULT '' NOT NULL
);

CREATE INDEX secfilter_secfilter_idx ON secfilter (action, type, data);

INSERT INTO version (table_name, table_version) values ('secfilter','1');

CREATE TABLE sip_trace (
    id INTEGER PRIMARY KEY NOT NULL,
    time_stamp TIMESTAMP WITHOUT TIME ZONE DEFAULT '2000-01-01 00:00:01' NOT NULL,
    time_us INTEGER DEFAULT 0 NOT NULL,
    callid VARCHAR(255) DEFAULT '' NOT NULL,
    traced_user VARCHAR(255) DEFAULT '' NOT NULL,
    msg TEXT NOT NULL,
    method VARCHAR(50) DEFAULT '' NOT NULL,
    status VARCHAR(255) DEFAULT '' NOT NULL,
    fromip VARCHAR(50) DEFAULT '' NOT NULL,
    toip VARCHAR(50) DEFAULT '' NOT NULL,
    fromtag VARCHAR(128) DEFAULT '' NOT NULL,
    totag VARCHAR(128) DEFAULT '' NOT NULL,
    direction VARCHAR(4) DEFAULT '' NOT NULL
);

CREATE INDEX sip_trace_traced_user_idx ON sip_trace (traced_user);
CREATE INDEX sip_trace_date_idx ON sip_trace (time_stamp);
CREATE INDEX sip_trace_fromip_idx ON sip_trace (fromip);
CREATE INDEX sip_trace_callid_idx ON sip_trace (callid);

INSERT INTO version (table_name, table_version) values ('sip_trace','4');

CREATE TABLE speed_dial (
    id INTEGER PRIMARY KEY NOT NULL,
    username VARCHAR(64) DEFAULT '' NOT NULL,
    domain VARCHAR(64) DEFAULT '' NOT NULL,
    sd_username VARCHAR(64) DEFAULT '' NOT NULL,
    sd_domain VARCHAR(64) DEFAULT '' NOT NULL,
    new_uri VARCHAR(255) DEFAULT '' NOT NULL,
    fname VARCHAR(64) DEFAULT '' NOT NULL,
    lname VARCHAR(64) DEFAULT '' NOT NULL,
    description VARCHAR(64) DEFAULT '' NOT NULL,
    CONSTRAINT speed_dial_speed_dial_idx UNIQUE (username, domain, sd_domain, sd_username)
);

INSERT INTO version (table_name, table_version) values ('speed_dial','2');

CREATE TABLE topos_d (
    id INTEGER PRIMARY KEY NOT NULL,
    rectime TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    s_method VARCHAR(64) DEFAULT '' NOT NULL,
    s_cseq VARCHAR(64) DEFAULT '' NOT NULL,
    a_callid VARCHAR(255) DEFAULT '' NOT NULL,
    a_uuid VARCHAR(255) DEFAULT '' NOT NULL,
    b_uuid VARCHAR(255) DEFAULT '' NOT NULL,
    a_contact VARCHAR(512) DEFAULT '' NOT NULL,
    b_contact VARCHAR(512) DEFAULT '' NOT NULL,
    as_contact VARCHAR(512) DEFAULT '' NOT NULL,
    bs_contact VARCHAR(512) DEFAULT '' NOT NULL,
    a_tag VARCHAR(255) DEFAULT '' NOT NULL,
    b_tag VARCHAR(255) DEFAULT '' NOT NULL,
    a_rr TEXT,
    b_rr TEXT,
    s_rr TEXT,
    iflags INTEGER DEFAULT 0 NOT NULL,
    a_uri VARCHAR(255) DEFAULT '' NOT NULL,
    b_uri VARCHAR(255) DEFAULT '' NOT NULL,
    r_uri VARCHAR(255) DEFAULT '' NOT NULL,
    a_srcaddr VARCHAR(128) DEFAULT '' NOT NULL,
    b_srcaddr VARCHAR(128) DEFAULT '' NOT NULL,
    a_socket VARCHAR(128) DEFAULT '' NOT NULL,
    b_socket VARCHAR(128) DEFAULT '' NOT NULL
);

CREATE INDEX topos_d_rectime_idx ON topos_d (rectime);
CREATE INDEX topos_d_a_callid_idx ON topos_d (a_callid);
CREATE INDEX topos_d_a_uuid_idx ON topos_d (a_uuid);
CREATE INDEX topos_d_b_uuid_idx ON topos_d (b_uuid);

INSERT INTO version (table_name, table_version) values ('topos_d','1');

CREATE TABLE topos_t (
    id INTEGER PRIMARY KEY NOT NULL,
    rectime TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    s_method VARCHAR(64) DEFAULT '' NOT NULL,
    s_cseq VARCHAR(64) DEFAULT '' NOT NULL,
    a_callid VARCHAR(255) DEFAULT '' NOT NULL,
    a_uuid VARCHAR(255) DEFAULT '' NOT NULL,
    b_uuid VARCHAR(255) DEFAULT '' NOT NULL,
    direction INTEGER DEFAULT 0 NOT NULL,
    x_via TEXT,
    x_vbranch VARCHAR(255) DEFAULT '' NOT NULL,
    x_rr TEXT,
    y_rr TEXT,
    s_rr TEXT,
    x_uri VARCHAR(255) DEFAULT '' NOT NULL,
    a_contact VARCHAR(512) DEFAULT '' NOT NULL,
    b_contact VARCHAR(512) DEFAULT '' NOT NULL,
    as_contact VARCHAR(512) DEFAULT '' NOT NULL,
    bs_contact VARCHAR(512) DEFAULT '' NOT NULL,
    x_tag VARCHAR(255) DEFAULT '' NOT NULL,
    a_tag VARCHAR(255) DEFAULT '' NOT NULL,
    b_tag VARCHAR(255) DEFAULT '' NOT NULL,
    a_srcaddr VARCHAR(255) DEFAULT '' NOT NULL,
    b_srcaddr VARCHAR(255) DEFAULT '' NOT NULL,
    a_socket VARCHAR(128) DEFAULT '' NOT NULL,
    b_socket VARCHAR(128) DEFAULT '' NOT NULL
);

CREATE INDEX topos_t_rectime_idx ON topos_t (rectime);
CREATE INDEX topos_t_a_callid_idx ON topos_t (a_callid);
CREATE INDEX topos_t_x_vbranch_idx ON topos_t (x_vbranch);
CREATE INDEX topos_t_a_uuid_idx ON topos_t (a_uuid);

INSERT INTO version (table_name, table_version) values ('topos_t','1');

CREATE TABLE uacreg (
    id INTEGER PRIMARY KEY NOT NULL,
    l_uuid VARCHAR(64) DEFAULT '' NOT NULL,
    l_username VARCHAR(64) DEFAULT '' NOT NULL,
    l_domain VARCHAR(64) DEFAULT '' NOT NULL,
    r_username VARCHAR(64) DEFAULT '' NOT NULL,
    r_domain VARCHAR(64) DEFAULT '' NOT NULL,
    realm VARCHAR(64) DEFAULT '' NOT NULL,
    auth_username VARCHAR(64) DEFAULT '' NOT NULL,
    auth_password VARCHAR(64) DEFAULT '' NOT NULL,
    auth_ha1 VARCHAR(128) DEFAULT '' NOT NULL,
    auth_proxy VARCHAR(255) DEFAULT '' NOT NULL,
    expires INTEGER DEFAULT 0 NOT NULL,
    flags INTEGER DEFAULT 0 NOT NULL,
    reg_delay INTEGER DEFAULT 0 NOT NULL,
    socket VARCHAR(128) DEFAULT '' NOT NULL,
    CONSTRAINT uacreg_l_uuid_idx UNIQUE (l_uuid)
);

INSERT INTO version (table_name, table_version) values ('uacreg','4');

CREATE TABLE uid_credentials (
    id INTEGER PRIMARY KEY NOT NULL,
    auth_username VARCHAR(64) NOT NULL,
    did VARCHAR(64) DEFAULT '_default' NOT NULL,
    realm VARCHAR(64) NOT NULL,
    password VARCHAR(28) DEFAULT '' NOT NULL,
    flags INTEGER DEFAULT 0 NOT NULL,
    ha1 VARCHAR(32) NOT NULL,
    ha1b VARCHAR(32) DEFAULT '' NOT NULL,
    uid VARCHAR(64) NOT NULL
);

CREATE INDEX uid_credentials_cred_idx ON uid_credentials (auth_username, did);
CREATE INDEX uid_credentials_uid ON uid_credentials (uid);
CREATE INDEX uid_credentials_did_idx ON uid_credentials (did);
CREATE INDEX uid_credentials_realm_idx ON uid_credentials (realm);

INSERT INTO version (table_name, table_version) values ('uid_credentials','7');

CREATE TABLE uid_user_attrs (
    id INTEGER PRIMARY KEY NOT NULL,
    uid VARCHAR(64) NOT NULL,
    name VARCHAR(32) NOT NULL,
    value VARCHAR(128),
    type INTEGER DEFAULT 0 NOT NULL,
    flags INTEGER DEFAULT 0 NOT NULL,
    CONSTRAINT uid_user_attrs_userattrs_idx UNIQUE (uid, name, value)
);

INSERT INTO version (table_name, table_version) values ('uid_user_attrs','3');

CREATE TABLE uid_domain (
    id INTEGER PRIMARY KEY NOT NULL,
    did VARCHAR(64) NOT NULL,
    domain VARCHAR(64) NOT NULL,
    flags INTEGER DEFAULT 0 NOT NULL,
    CONSTRAINT uid_domain_domain_idx UNIQUE (domain)
);

CREATE INDEX uid_domain_did_idx ON uid_domain (did);

INSERT INTO version (table_name, table_version) values ('uid_domain','2');

CREATE TABLE uid_domain_attrs (
    id INTEGER PRIMARY KEY NOT NULL,
    did VARCHAR(64),
    name VARCHAR(32) NOT NULL,
    type INTEGER DEFAULT 0 NOT NULL,
    value VARCHAR(128),
    flags INTEGER DEFAULT 0 NOT NULL,
    CONSTRAINT uid_domain_attrs_domain_attr_idx UNIQUE (did, name, value)
);

CREATE INDEX uid_domain_attrs_domain_did ON uid_domain_attrs (did, flags);

INSERT INTO version (table_name, table_version) values ('uid_domain_attrs','1');

CREATE TABLE uid_global_attrs (
    id INTEGER PRIMARY KEY NOT NULL,
    name VARCHAR(32) NOT NULL,
    type INTEGER DEFAULT 0 NOT NULL,
    value VARCHAR(128),
    flags INTEGER DEFAULT 0 NOT NULL,
    CONSTRAINT uid_global_attrs_global_attrs_idx UNIQUE (name, value)
);

INSERT INTO version (table_name, table_version) values ('uid_global_attrs','1');

CREATE TABLE uid_uri (
    id INTEGER PRIMARY KEY NOT NULL,
    uid VARCHAR(64) NOT NULL,
    did VARCHAR(64) NOT NULL,
    username VARCHAR(64) NOT NULL,
    flags INTEGER DEFAULT 0 NOT NULL,
    scheme VARCHAR(8) DEFAULT 'sip' NOT NULL
);

CREATE INDEX uid_uri_uri_idx1 ON uid_uri (username, did, scheme);
CREATE INDEX uid_uri_uri_uid ON uid_uri (uid);

INSERT INTO version (table_name, table_version) values ('uid_uri','3');

CREATE TABLE uid_uri_attrs (
    id INTEGER PRIMARY KEY NOT NULL,
    username VARCHAR(64) NOT NULL,
    did VARCHAR(64) NOT NULL,
    name VARCHAR(32) NOT NULL,
    value VARCHAR(128),
    type INTEGER DEFAULT 0 NOT NULL,
    flags INTEGER DEFAULT 0 NOT NULL,
    scheme VARCHAR(8) DEFAULT 'sip' NOT NULL,
    CONSTRAINT uid_uri_attrs_uriattrs_idx UNIQUE (username, did, name, value, scheme)
);

INSERT INTO version (table_name, table_version) values ('uid_uri_attrs','2');

CREATE TABLE uri (
    id INTEGER PRIMARY KEY NOT NULL,
    username VARCHAR(64) DEFAULT '' NOT NULL,
    domain VARCHAR(64) DEFAULT '' NOT NULL,
    uri_user VARCHAR(64) DEFAULT '' NOT NULL,
    last_modified TIMESTAMP WITHOUT TIME ZONE DEFAULT '2000-01-01 00:00:01' NOT NULL,
    CONSTRAINT uri_account_idx UNIQUE (username, domain, uri_user)
);

INSERT INTO version (table_name, table_version) values ('uri','1');

CREATE TABLE userblacklist (
    id INTEGER PRIMARY KEY NOT NULL,
    username VARCHAR(64) DEFAULT '' NOT NULL,
    domain VARCHAR(64) DEFAULT '' NOT NULL,
    prefix VARCHAR(64) DEFAULT '' NOT NULL,
    whitelist SMALLINT DEFAULT 0 NOT NULL
);

CREATE INDEX userblacklist_userblacklist_idx ON userblacklist (username, domain, prefix);

INSERT INTO version (table_name, table_version) values ('userblacklist','1');

CREATE TABLE globalblacklist (
    id INTEGER PRIMARY KEY NOT NULL,
    prefix VARCHAR(64) DEFAULT '' NOT NULL,
    whitelist SMALLINT DEFAULT 0 NOT NULL,
    description VARCHAR(255) DEFAULT NULL
);

CREATE INDEX globalblacklist_globalblacklist_idx ON globalblacklist (prefix);

INSERT INTO version (table_name, table_version) values ('globalblacklist','1');

CREATE TABLE location (
    id INTEGER PRIMARY KEY NOT NULL,
    ruid VARCHAR(64) DEFAULT '' NOT NULL,
    username VARCHAR(64) DEFAULT '' NOT NULL,
    domain VARCHAR(64) DEFAULT NULL,
    contact VARCHAR(512) DEFAULT '' NOT NULL,
    received VARCHAR(128) DEFAULT NULL,
    path VARCHAR(512) DEFAULT NULL,
    expires TIMESTAMP WITHOUT TIME ZONE DEFAULT '2030-05-28 21:32:15' NOT NULL,
    q REAL DEFAULT 1.0 NOT NULL,
    callid VARCHAR(255) DEFAULT 'Default-Call-ID' NOT NULL,
    cseq INTEGER DEFAULT 1 NOT NULL,
    last_modified TIMESTAMP WITHOUT TIME ZONE DEFAULT '2000-01-01 00:00:01' NOT NULL,
    flags INTEGER DEFAULT 0 NOT NULL,
    cflags INTEGER DEFAULT 0 NOT NULL,
    user_agent VARCHAR(255) DEFAULT '' NOT NULL,
    socket VARCHAR(64) DEFAULT NULL,
    methods INTEGER DEFAULT NULL,
    instance VARCHAR(255) DEFAULT NULL,
    reg_id INTEGER DEFAULT 0 NOT NULL,
    server_id INTEGER DEFAULT 0 NOT NULL,
    connection_id INTEGER DEFAULT 0 NOT NULL,
    keepalive INTEGER DEFAULT 0 NOT NULL,
    partition INTEGER DEFAULT 0 NOT NULL,
    CONSTRAINT location_ruid_idx UNIQUE (ruid)
);

CREATE INDEX location_account_contact_idx ON location (username, domain, contact);
CREATE INDEX location_expires_idx ON location (expires);
CREATE INDEX location_connection_idx ON location (server_id, connection_id);

INSERT INTO version (table_name, table_version) values ('location','9');

CREATE TABLE location_attrs (
    id INTEGER PRIMARY KEY NOT NULL,
    ruid VARCHAR(64) DEFAULT '' NOT NULL,
    username VARCHAR(64) DEFAULT '' NOT NULL,
    domain VARCHAR(64) DEFAULT NULL,
    aname VARCHAR(64) DEFAULT '' NOT NULL,
    atype INTEGER DEFAULT 0 NOT NULL,
    avalue VARCHAR(512) DEFAULT '' NOT NULL,
    last_modified TIMESTAMP WITHOUT TIME ZONE DEFAULT '2000-01-01 00:00:01' NOT NULL
);

CREATE INDEX location_attrs_account_record_idx ON location_attrs (username, domain, ruid);
CREATE INDEX location_attrs_last_modified_idx ON location_attrs (last_modified);

INSERT INTO version (table_name, table_version) values ('location_attrs','1');

