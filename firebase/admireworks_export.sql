-- ============================================================
-- ADMIREWORKS - COMPLETE DATA EXPORT
-- Generated: 2025-11-09
-- ============================================================
--
-- CONTENTS OF THIS FILE
-- ─────────────────────
-- 1. HOW TO IMPORT
-- 2. DATABASE SCHEMA + ALL DATA (PostgreSQL SQL)
-- 3. CLIENTS SUMMARY
-- 4. API CREDENTIALS (platform_connections)
-- 5. USER ACCOUNTS
-- 6. ENVIRONMENT VARIABLES NEEDED
--
-- ============================================================
-- SECTION 1: HOW TO IMPORT
-- ============================================================
--
-- This file is a standard PostgreSQL SQL dump. To import it
-- into a new PostgreSQL database, run:
--
--   psql -U <your_user> -d <your_database> -f admireworks_export.sql
--
-- Or with a connection URL:
--
--   psql "postgresql://user:password@host:5432/dbname" -f admireworks_export.sql
--
-- Requirements:
--   - PostgreSQL 14+ recommended
--   - The target database must already exist (CREATE DATABASE admireworks;)
--   - The pgcrypto extension is required for gen_random_uuid()
--     (usually pre-installed; if not: CREATE EXTENSION IF NOT EXISTS pgcrypto;)
--
-- After importing:
--   - Set your environment variables (see Section 6 below)
--   - Re-enter any API credentials that you wish to rotate
--     (all credentials from the original system are included as-is)
--
-- ============================================================
-- SECTION 3: CLIENTS SUMMARY
-- ============================================================
--
-- The following clients exist in the system:
--
-- ID                                   | Name            | Currency | Created
-- -------------------------------------|-----------------|----------|--------------------
-- d62f5b38-f080-4dbc-a56d-a3eb5499fcfc | Genco           | EGP      | 2025-11-03
-- 7d3eb02b-ba36-4b13-af1d-1706bd7c988f | Test Client     | EUR      | 2025-11-03
-- da68b4af-d351-4b48-89de-072054dae6ee | Test Client E2E | USD      | 2025-11-05
-- 30926e7b-57d9-4959-838e-e7483d3eb95c | Auth Test Client| USD      | 2025-11-05
-- 5a2f20f7-1d2a-42e9-b65a-9521ff8dd8a6 | Jasmin Store    | EGP      | 2025-11-06
-- fdc892a7-d308-47b8-976a-6dc9f1eac27e | Pose            | EGP      | 2025-11-06
-- 2f3110f0-87be-4416-8797-32bd0d755596 | Sultan Saray    | EGP      | 2025-11-06
--
-- ============================================================
-- SECTION 4: API CREDENTIALS (platform_connections)
-- ============================================================
-- All live API credentials are included in the INSERT statements
-- below. They are also summarised here for quick reference.
--
-- CLIENT: Genco (d62f5b38-...)
--   Platform : Meta Ads
--   Ad Account ID  : 565810425828068
--   Access Token   : EAA66vRZA1HS0BP6LZAjssOl2FFU9i1pSCuwcbST77mUSAYkTujHffYpjWYZBQeXoKSgJbJRgvrLUTpV3qkTWHw2UAWb77sBvv93RADxGLWIoX8ERiGmF9vUZAPOp1TZBm0f5DzaDcZCYzEfCqEFSqmwUzxqXrZAuGFZCjP6dF1HZApBfji1E62SB22Wu1u9PPnSMHXjUZD
--
--   Platform : Shopify
--   Shop URL       : 46c213.myshopify.com
--   Access Token   : [REDACTED]
--
-- CLIENT: Jasmin Store (5a2f20f7-...)
--   Platform : Meta Ads
--   Ad Account ID  : 235252242319187
--   Access Token   : EAA66vRZA1HS0BP6LZAjssOl2FFU9i1pSCuwcbST77mUSAYkTujHffYpjWYZBQeXoKSgJbJRgvrLUTpV3qkTWHw2UAWb77sBvv93RADxGLWIoX8ERiGmF9vUZAPOp1TZBm0f5DzaDcZCYzEfCqEFSqmwUzxqXrZAuGFZCjP6dF1HZApBfji1E62SB22Wu1u9PPnSMHXjUZD
--
-- CLIENT: Pose (fdc892a7-...)
--   Platform : Meta Ads
--   Ad Account ID  : 718586248586722
--   Access Token   : EAA66vRZA1HS0BP6LZAjssOl2FFU9i1pSCuwcbST77mUSAYkTujHffYpjWYZBQeXoKSgJbJRgvrLUTpV3qkTWHw2UAWb77sBvv93RADxGLWIoX8ERiGmF9vUZAPOp1TZBm0f5DzaDcZCYzEfCqEFSqmwUzxqXrZAuGFZCjP6dF1HZApBfji1E62SB22Wu1u9PPnSMHXjUZD
--
-- CLIENT: Sultan Saray (2f3110f0-...)
--   Platform : Meta Ads
--   Ad Account ID  : 837221486760083
--   Access Token   : EAA66vRZA1HS0BP6LZAjssOl2FFU9i1pSCuwcbST77mUSAYkTujHffYpjWYZBQeXoKSgJbJRgvrLUTpV3qkTWHw2UAWb77sBvv93RADxGLWIoX8ERiGmF9vUZAPOp1TZBm0f5DzaDcZCYzEfCqEFSqmwUzxqXrZAuGFZCjP6dF1HZApBfji1E62SB22Wu1u9PPnSMHXjUZD
--
-- ============================================================
-- SECTION 5: USER ACCOUNTS
-- ============================================================
-- Passwords are stored as scrypt hashes (format: hash.salt).
-- They cannot be reversed. Users will need to reset passwords
-- OR the hashes can be imported and will continue to work if
-- the new system uses the same scrypt hashing implementation.
--
-- Username                  | Role  | Created
-- --------------------------|-------|--------------------
-- testadmin                 | admin | 2025-11-05
-- fnasr@admireworks.com     | admin | 2025-11-05
--
-- ============================================================
-- SECTION 6: ENVIRONMENT VARIABLES NEEDED
-- ============================================================
-- Configure these on the new platform before starting the app:
--
--   DATABASE_URL    = postgresql://user:password@host:5432/dbname
--   PGHOST          = your-db-host
--   PGPORT          = 5432
--   PGUSER          = your-db-user
--   PGPASSWORD      = your-db-password
--   PGDATABASE      = your-db-name
--   SESSION_SECRET  = (generate a new random 64-char string)
--                     e.g. openssl rand -hex 32
--
-- Optional (for Google Analytics integration):
--   VITE_GA_MEASUREMENT_ID = G-XXXXXXXXXX
--
-- ============================================================
-- SECTION 2: DATABASE SCHEMA + ALL DATA
-- ============================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    base_currency text DEFAULT 'USD'::text NOT NULL,
    ga4_property_id text,
    ga4_credentials jsonb
);


--
-- Name: data_sync_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_sync_jobs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    job_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    start_date text,
    end_date text,
    error_message text,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: monthly_client_rollups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monthly_client_rollups (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    platform_type text NOT NULL,
    month_end_date text NOT NULL,
    currency text NOT NULL,
    impressions text DEFAULT '0'::text,
    clicks text DEFAULT '0'::text,
    spend text DEFAULT '0'::text,
    revenue text DEFAULT '0'::text,
    conversions text DEFAULT '0'::text,
    orders text DEFAULT '0'::text,
    sessions text DEFAULT '0'::text,
    roas text DEFAULT '0'::text,
    cpo text DEFAULT '0'::text,
    aov text DEFAULT '0'::text,
    cpm text DEFAULT '0'::text,
    aggregated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: monthly_data_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monthly_data_overrides (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    month_end_date text NOT NULL,
    metric_id text NOT NULL,
    override_value text NOT NULL,
    edited_by character varying NOT NULL,
    edited_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: monthly_platform_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monthly_platform_metrics (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    platform text NOT NULL,
    platform_type text NOT NULL,
    month_end_date text NOT NULL,
    currency text NOT NULL,
    original_currency text,
    impressions text DEFAULT '0'::text,
    clicks text DEFAULT '0'::text,
    spend text DEFAULT '0'::text,
    revenue text DEFAULT '0'::text,
    conversions text DEFAULT '0'::text,
    orders text DEFAULT '0'::text,
    sessions text DEFAULT '0'::text,
    reach text DEFAULT '0'::text,
    frequency text DEFAULT '0'::text,
    link_clicks text DEFAULT '0'::text,
    cpm text DEFAULT '0'::text,
    aggregated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: overrides_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.overrides_audit (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    override_id character varying,
    client_id character varying NOT NULL,
    month_end_date text NOT NULL,
    metric_id text NOT NULL,
    action_type text NOT NULL,
    old_value text,
    new_value text,
    edited_by character varying NOT NULL,
    edited_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: platform_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_connections (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    platform text NOT NULL,
    is_connected boolean DEFAULT false NOT NULL,
    credentials jsonb,
    last_sync timestamp without time zone
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    name text NOT NULL,
    date_range jsonb,
    platforms text[],
    generated_at timestamp without time zone DEFAULT now() NOT NULL,
    slug text,
    description text,
    content text,
    is_public boolean DEFAULT true NOT NULL,
    created_by character varying
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clients (id, name, email, created_at, base_currency, ga4_property_id, ga4_credentials) FROM stdin;
d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Genco	\N	2025-11-03 18:28:33.529032	EGP	\N	\N
7d3eb02b-ba36-4b13-af1d-1706bd7c988f	Test Client eu4KJL	U_UKlz@example.com	2025-11-03 19:14:30.977715	EUR		\N
da68b4af-d351-4b48-89de-072054dae6ee	Test Client for E2E	\N	2025-11-05 20:29:57.154181	USD	\N	\N
30926e7b-57d9-4959-838e-e7483d3eb95c	Auth Test Client	\N	2025-11-05 20:33:00.917445	USD	\N	\N
5a2f20f7-1d2a-42e9-b65a-9521ff8dd8a6	Jasmin Store	\N	2025-11-06 11:19:55.32218	EGP	\N	\N
fdc892a7-d308-47b8-976a-6dc9f1eac27e	Pose	\N	2025-11-06 13:14:22.419812	EGP	\N	\N
2f3110f0-87be-4416-8797-32bd0d755596	Sultan Saray	\N	2025-11-06 13:59:32.715683	EGP	\N	\N
\.


--
-- Data for Name: data_sync_jobs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.data_sync_jobs (id, client_id, job_type, status, start_date, end_date, error_message, started_at, completed_at, created_at) FROM stdin;
dd9e8a2d-00b4-4493-bdef-85de436a5e62	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	initial_backfill	completed	\N	\N	\N	2025-11-05 21:36:08.135	2025-11-05 21:37:13.739	2025-11-05 21:36:08.153766
\.


--
-- Data for Name: monthly_client_rollups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.monthly_client_rollups (id, client_id, platform_type, month_end_date, currency, impressions, clicks, spend, revenue, conversions, orders, sessions, roas, cpo, aov, cpm, aggregated_at) FROM stdin;
0b817acb-9087-456b-afef-058816bd3c33	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ad	2025-10-31	EGP	291240	5592	17210.710626702996	119386.57029972752	101	0	0	6.936760072794161	170.40307551191086	0	59.094597674436876	2025-11-05 21:36:09.722922
d97f4bab-3e7d-42a4-91cd-af9105ae2281	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ecommerce	2025-10-31	EGP	0	0	0	474344.9	0	247	0	0	0	1920.4246963562755	0	2025-11-05 21:36:09.771801
0552d0cc-4c15-4435-a5d6-84fd4c745b68	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	combined	2025-10-31	EGP	291240	5592	17210.710626702996	593731.4702997275	348	247	0	6.936760072794161	170.40307551191086	1920.4246963562755	59.094597674436876	2025-11-05 21:36:09.817824
42c3da16-4c57-4c86-8b15-8ea0954e1106	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ad	2025-09-30	EGP	1034536	22269	58647.021253406	524570.1032697547	433	0	0	8.944531061571855	135.44346709793533	0	56.68920294064778	2025-11-05 21:36:11.835871
ef0ab9ab-bc1a-4c97-a4f9-182078af3491	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ecommerce	2025-09-30	EGP	0	0	0	885584.3	0	464	0	0	0	1908.5868534482759	0	2025-11-05 21:36:11.882285
b4143c11-6022-41a9-afa3-9f9cc281f72b	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	combined	2025-09-30	EGP	1034536	22269	58647.021253406	1410154.4032697547	897	464	0	8.944531061571855	135.44346709793533	1908.5868534482759	56.68920294064778	2025-11-05 21:36:11.928098
b7333af4-71e6-4dd9-ae61-3a722c5a238d	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ad	2025-08-31	EGP	614766	13726	45536.496457765665	353428.39046321524	269	0	0	7.761431334336715	169.28065597682402	0	74.07126688490526	2025-11-05 21:36:16.501204
d1d1a012-cd09-4f7a-bcc4-960ef35bf32d	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ecommerce	2025-08-31	EGP	0	0	0	665754.1	0	306	0	0	0	2175.666993464052	0	2025-11-05 21:36:16.54765
3d20f0ef-e40d-4002-ab74-815e4d375c3a	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	combined	2025-08-31	EGP	614766	13726	45536.496457765665	1019182.4904632152	575	306	0	7.761431334336715	169.28065597682402	2175.666993464052	74.07126688490526	2025-11-05 21:36:16.594743
7c7b00d3-90a2-40f4-b9fe-1f88f7675536	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ad	2025-07-31	EGP	936367	21551	62798.90354223434	518450.3877384196	326	0	0	8.255723563545095	192.63467344243662	0	67.06654927206355	2025-11-05 21:36:22.163678
6a7c9863-a66b-4cff-a562-ab4cd4606986	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ecommerce	2025-07-31	EGP	0	0	0	928732.1	0	361	0	0	0	2572.6650969529087	0	2025-11-05 21:36:22.212657
ef41a947-718c-456b-9827-b445fc190fe3	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	combined	2025-07-31	EGP	936367	21551	62798.90354223434	1447182.4877384196	687	361	0	8.255723563545095	192.63467344243662	2572.6650969529087	67.06654927206355	2025-11-05 21:36:22.259172
24138d33-b707-4fc6-8457-0610e666db2f	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ad	2025-06-30	EGP	1141780	24644	53388.632697547684	529166.625613079	404	0	0	9.911597260991204	132.15008093452397	0	46.75912408480415	2025-11-05 21:36:29.097203
c7a5db50-c9ca-44e6-a32f-535d79a06594	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ecommerce	2025-06-30	EGP	0	0	0	919703.4	0	426	0	0	0	2158.9281690140847	0	2025-11-05 21:36:29.143686
98744c05-09eb-4eac-a38f-da4dc8ce480f	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	combined	2025-06-30	EGP	1141780	24644	53388.632697547684	1448870.025613079	830	426	0	9.911597260991204	132.15008093452397	2158.9281690140847	46.75912408480415	2025-11-05 21:36:29.190509
b842c4e5-1ec5-4a52-bbe4-2940fb029290	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ad	2025-05-31	EGP	853814	24250	39505.860490463216	402151.9651226158	341	0	0	10.17955210011679	115.8529633151414	0	46.269867313563864	2025-11-05 21:36:36.271006
c9ad99f2-1c2c-4026-be38-59632d9e5157	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ecommerce	2025-05-31	EGP	0	0	0	772794.61	0	384	0	0	0	2012.4859635416667	0	2025-11-05 21:36:36.322055
3c26c271-b375-481c-a59a-53ecfa512799	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	combined	2025-05-31	EGP	853814	24250	39505.860490463216	1174946.5751226158	725	384	0	10.17955210011679	115.8529633151414	2012.4859635416667	46.269867313563864	2025-11-05 21:36:36.371256
8402985b-9d5d-4070-902d-0d406822a5ec	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ad	2025-04-30	EGP	660493	18911	27889.649591280653	260493.14632152588	197	0	0	9.340136937502642	141.57182533645002	0	42.22550366359772	2025-11-05 21:36:40.730061
9fce9189-7007-43c1-a8c4-e116da586fdc	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ecommerce	2025-04-30	EGP	0	0	0	472128.9	0	222	0	0	0	2126.706756756757	0	2025-11-05 21:36:40.776323
3b2573cd-c039-4e7e-86d4-683798653496	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	combined	2025-04-30	EGP	660493	18911	27889.649591280653	732622.0463215259	419	222	0	9.340136937502642	141.57182533645002	2126.706756756757	42.22550366359772	2025-11-05 21:36:40.82299
07e071e8-b749-43d2-95bf-d9721eb0d3e5	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ad	2025-03-31	EGP	345868	11076	16573.513896457767	167176.32506811988	99	0	0	10.086957184369346	167.40923127735118	0	47.91861026882443	2025-11-05 21:36:43.815366
0d0b47ad-fb81-4eac-b8b4-1b8e541f5650	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ecommerce	2025-03-31	EGP	0	0	0	318313.1	0	115	0	0	0	2767.9399999999996	0	2025-11-05 21:36:43.863155
98deb9e2-cbc3-4019-b175-024884fb6f8c	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	combined	2025-03-31	EGP	345868	11076	16573.513896457767	485489.4250681199	214	115	0	10.086957184369346	167.40923127735118	2767.9399999999996	47.91861026882443	2025-11-05 21:36:43.909581
4d930659-3112-4edb-bb25-0a76a18a2763	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ad	2025-02-28	EGP	508712	17045	22803.863215258854	227034.00326975476	175	0	0	9.955944794381965	130.30778980147917	0	44.826666591821805	2025-11-05 21:36:48.095274
0fdeece9-0862-46a4-b8a9-c1f77c49e31e	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ecommerce	2025-02-28	EGP	0	0	0	452493.1	0	206	0	0	0	2196.5684466019416	0	2025-11-05 21:36:48.141913
0f826296-3f64-4a40-aa26-0822f595accc	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	combined	2025-02-28	EGP	508712	17045	22803.863215258854	679527.1032697547	381	206	0	9.955944794381965	130.30778980147917	2196.5684466019416	44.826666591821805	2025-11-05 21:36:48.188814
d9504792-7e58-4223-ad5f-fb84678a1944	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ad	2025-01-31	EGP	646396	15292	26273.756403269756	251204.20217983652	201	0	0	9.561031103591045	130.7152059864167	0	40.64653309004041	2025-11-05 21:36:53.703622
36fdda3d-d70a-4862-ab55-5186da383bfc	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ecommerce	2025-01-31	EGP	0	0	0	440830.2	0	213	0	0	0	2069.625352112676	0	2025-11-05 21:36:53.752897
78670007-cf06-4a0e-bb88-83a32b6c2566	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	combined	2025-01-31	EGP	646396	15292	26273.756403269756	692034.4021798365	414	213	0	9.561031103591045	130.7152059864167	2069.625352112676	40.64653309004041	2025-11-05 21:36:53.799888
1ef03ea0-be71-4efb-a7f1-c13392ee50f1	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ad	2024-12-31	EGP	498496	11692	22651.047138964575	188710.08882833784	134	0	0	8.3311860891286	169.03766521615356	0	45.438774110453394	2025-11-05 21:36:57.591403
928d4c7f-11cb-478b-b402-83bcb2052f4c	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ecommerce	2024-12-31	EGP	0	0	0	405227.5	0	168	0	0	0	2412.0684523809523	0	2025-11-05 21:36:57.638665
baad8ca4-86ea-4986-8259-61a493f7f86a	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	combined	2024-12-31	EGP	498496	11692	22651.047138964575	593937.5888283378	302	168	0	8.3311860891286	169.03766521615356	2412.0684523809523	45.438774110453394	2025-11-05 21:36:57.684869
e16e6016-f152-4dbc-bdc3-0e31539a4225	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ad	2024-11-30	EGP	0	0	0	0	0	0	0	0	0	0	0	2025-11-05 21:37:03.79355
3a0c3ef3-8e1e-4bfe-b31a-99d0e55e84c1	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ecommerce	2024-11-30	EGP	0	0	0	861200.4	0	319	0	0	0	2699.687774294671	0	2025-11-05 21:37:03.840718
d3ef0bb4-2eac-40a6-a334-1668b232d72d	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	combined	2024-11-30	EGP	0	0	0	861200.4	319	319	0	0	0	2699.687774294671	0	2025-11-05 21:37:03.887242
94597de1-8dd7-42ae-ad71-b6e7d6dd934f	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ad	2024-10-31	EGP	0	0	0	0	0	0	0	0	0	0	0	2025-11-05 21:37:09.194589
25e4d4a8-f3fe-4e52-bada-6ecda8e97d32	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ecommerce	2024-10-31	EGP	0	0	0	820234.1	0	281	0	0	0	2918.98256227758	0	2025-11-05 21:37:09.242262
1a335da4-b630-4403-990c-437a3f7e6b67	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	combined	2024-10-31	EGP	0	0	0	820234.1	281	281	0	0	0	2918.98256227758	0	2025-11-05 21:37:09.288069
169e6db3-206e-46b6-bd61-275cc14f6829	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ad	2024-09-30	EGP	0	0	0	0	0	0	0	0	0	0	0	2025-11-05 21:37:13.617341
dcc4ecdc-f521-4e85-92ce-7945e5c55134	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	ecommerce	2024-09-30	EGP	0	0	0	923805.65	0	322	0	0	0	2868.961645962733	0	2025-11-05 21:37:13.663885
d670bcf6-13a0-453d-9161-e45e139551ce	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	combined	2024-09-30	EGP	0	0	0	923805.65	322	322	0	0	0	2868.961645962733	0	2025-11-05 21:37:13.710726
\.


--
-- Data for Name: monthly_data_overrides; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.monthly_data_overrides (id, client_id, month_end_date, metric_id, override_value, edited_by, edited_at) FROM stdin;
\.


--
-- Data for Name: monthly_platform_metrics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.monthly_platform_metrics (id, client_id, platform, platform_type, month_end_date, currency, original_currency, impressions, clicks, spend, revenue, conversions, orders, sessions, reach, frequency, link_clicks, cpm, aggregated_at) FROM stdin;
52553a9a-5629-48fe-9acc-ffc2f13063a4	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Meta Ads	ad	2025-10-31	EGP	AED	291240	5592	17210.710626702996	119386.57029972752	101	0	0	97772	2.98	4120	7.02	2025-11-05 21:36:08.954267
fd886005-be05-4d00-a3f9-f5e257fc5352	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Shopify	ecommerce	2025-10-31	EGP	EGP	0	0	0	474344.9	0	247	0	0	0	0	0	2025-11-05 21:36:09.63037
f6a24fa4-1701-4d3f-934e-7fba6380b61c	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Meta Ads	ad	2025-09-30	EGP	AED	1034536	22269	58647.021253406	524570.1032697547	433	0	0	206345	5.01	16070	6.73	2025-11-05 21:36:10.303189
f517057c-cba6-4cfa-9238-da737487a0d2	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Shopify	ecommerce	2025-09-30	EGP	EGP	0	0	0	885584.3	0	464	0	0	0	0	0	2025-11-05 21:36:11.743905
7d652892-a499-4ae4-a523-62383a9d04df	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Meta Ads	ad	2025-08-31	EGP	AED	614766	13726	45536.496457765665	353428.39046321524	269	0	0	136306	4.51	9371	8.8	2025-11-05 21:36:12.444279
33c35936-48a9-4b27-9aec-9a2169491bee	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Shopify	ecommerce	2025-08-31	EGP	EGP	0	0	0	665754.1	0	306	0	0	0	0	0	2025-11-05 21:36:16.409925
3e1bc4d2-25cc-4e28-b88a-43e5fede4519	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Meta Ads	ad	2025-07-31	EGP	AED	936367	21551	62798.90354223434	518450.3877384196	326	0	0	208273	4.5	14831	7.97	2025-11-05 21:36:17.060132
a3901363-c94f-430c-be0d-2e0eeaa51197	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Shopify	ecommerce	2025-07-31	EGP	EGP	0	0	0	928732.1	0	361	0	0	0	0	0	2025-11-05 21:36:22.070405
4fe5a889-edfd-494b-b98e-ac31808cd4a4	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Meta Ads	ad	2025-06-30	EGP	AED	1141780	24644	53388.632697547684	529166.625613079	404	0	0	246390	4.63	17400	5.55	2025-11-05 21:36:22.846065
95958e2a-78f6-4f6e-8510-42cd0bbb6c4f	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Shopify	ecommerce	2025-06-30	EGP	EGP	0	0	0	919703.4	0	426	0	0	0	0	0	2025-11-05 21:36:29.003953
876bc33b-e05b-456b-a203-1a14574f724f	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Meta Ads	ad	2025-05-31	EGP	AED	853814	24250	39505.860490463216	402151.9651226158	341	0	0	218285	3.91	20134	5.5	2025-11-05 21:36:30.120179
0f743079-c710-4559-bf05-8404e97ac68d	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Shopify	ecommerce	2025-05-31	EGP	EGP	0	0	0	772794.61	0	384	0	0	0	0	0	2025-11-05 21:36:36.175439
de4e7267-3a26-49ff-a3e4-5c9e47da0553	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Meta Ads	ad	2025-04-30	EGP	AED	660493	18911	27889.649591280653	260493.14632152588	197	0	0	184074	3.59	14316	5.02	2025-11-05 21:36:37.11962
1ce94d3b-0d94-4ef7-ac89-377c86974aa2	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Shopify	ecommerce	2025-04-30	EGP	EGP	0	0	0	472128.9	0	222	0	0	0	0	0	2025-11-05 21:36:40.635696
9aa01d87-cd79-4e7e-a8f3-cb53a8c49fc7	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Meta Ads	ad	2025-03-31	EGP	AED	345868	11076	16573.513896457767	167176.32506811988	99	0	0	99554	3.47	9531	5.69	2025-11-05 21:36:41.385283
65ebe200-e47e-4d5b-b405-2c7ed2121aba	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Shopify	ecommerce	2025-03-31	EGP	EGP	0	0	0	318313.1	0	115	0	0	0	0	0	2025-11-05 21:36:43.715186
f1a1d86d-f66a-44db-92ff-ef2abac73322	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Meta Ads	ad	2025-02-28	EGP	AED	508712	17045	22803.863215258854	227034.00326975476	175	0	0	129228	3.94	14737	5.32	2025-11-05 21:36:44.600185
0e6d54bb-ff00-41c5-a6c3-af416792c304	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Shopify	ecommerce	2025-02-28	EGP	EGP	0	0	0	452493.1	0	206	0	0	0	0	0	2025-11-05 21:36:47.996399
19149550-981d-4639-9c8c-38a27bdf33c5	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Meta Ads	ad	2025-01-31	EGP	AED	646396	15292	26273.756403269756	251204.20217983652	201	0	0	155250	4.16	11808	4.83	2025-11-05 21:36:50.002844
de11919c-5bfc-44dc-8d59-60c0dc15d69f	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Shopify	ecommerce	2025-01-31	EGP	EGP	0	0	0	440830.2	0	213	0	0	0	0	0	2025-11-05 21:36:53.609566
97b0039c-c09b-4981-99da-3d2b5e6a9a04	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Meta Ads	ad	2024-12-31	EGP	AED	498496	11692	22651.047138964575	188710.08882833784	134	0	0	146659	3.4	7384	5.4	2025-11-05 21:36:54.351587
33f47ce4-8994-4521-ae5b-8602e76625d4	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Shopify	ecommerce	2024-12-31	EGP	EGP	0	0	0	405227.5	0	168	0	0	0	0	0	2025-11-05 21:36:57.497783
3ac24ee5-eb04-49b2-9988-4f13e1f3d937	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Meta Ads	ad	2024-11-30	EGP	USD	0	0	0	0	0	0	0	0	0	0	0	2025-11-05 21:36:58.142871
24ae6e0a-acb6-4a8a-8ec7-230a175e6f0d	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Shopify	ecommerce	2024-11-30	EGP	EGP	0	0	0	861200.4	0	319	0	0	0	0	0	2025-11-05 21:37:03.701151
b74bdf76-34d6-4dd0-b90c-b5614d046714	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Meta Ads	ad	2024-10-31	EGP	USD	0	0	0	0	0	0	0	0	0	0	0	2025-11-05 21:37:04.322993
e95e2976-86aa-4fdb-97a6-a0b51f768ad9	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Shopify	ecommerce	2024-10-31	EGP	EGP	0	0	0	820234.1	0	281	0	0	0	0	0	2025-11-05 21:37:09.101273
252a1e8d-e6a2-4664-9330-f8579e57db17	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Meta Ads	ad	2024-09-30	EGP	USD	0	0	0	0	0	0	0	0	0	0	0	2025-11-05 21:37:09.781464
dd584486-7863-4f24-a1fd-c53bc335c0b6	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Shopify	ecommerce	2024-09-30	EGP	EGP	0	0	0	923805.65	0	322	0	0	0	0	0	2025-11-05 21:37:13.523774
\.


--
-- Data for Name: overrides_audit; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.overrides_audit (id, override_id, client_id, month_end_date, metric_id, action_type, old_value, new_value, edited_by, edited_at) FROM stdin;
\.


--
-- Data for Name: platform_connections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.platform_connections (id, client_id, platform, is_connected, credentials, last_sync) FROM stdin;
dbf7b749-ad8f-4e3b-b730-1b93aeee32f8	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Meta Ads	t	{"accessToken": "EAA66vRZA1HS0BP6LZAjssOl2FFU9i1pSCuwcbST77mUSAYkTujHffYpjWYZBQeXoKSgJbJRgvrLUTpV3qkTWHw2UAWb77sBvv93RADxGLWIoX8ERiGmF9vUZAPOp1TZBm0f5DzaDcZCYzEfCqEFSqmwUzxqXrZAuGFZCjP6dF1HZApBfji1E62SB22Wu1u9PPnSMHXjUZD", "adAccountId": "565810425828068"}	\N
5a9b60e4-8071-4cbc-830b-58764c2e1144	7d3eb02b-ba36-4b13-af1d-1706bd7c988f	Google Ads	t	{"customerId": "123-456-7890", "refreshToken": "test-refresh-token", "developerToken": "test-dev-token"}	\N
30acf19b-ca7e-4d25-96de-41c985d39533	7d3eb02b-ba36-4b13-af1d-1706bd7c988f	WooCommerce	t	{"storeUrl": "https://mystore.com", "consumerKey": "ck_test123", "consumerSecret": "cs_test456"}	\N
83da2dc5-89ef-4adf-9b48-43f2281a6710	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Shopify	t	{"shopUrl": "46c213.myshopify.com", "accessToken": "[REDACTED]"}	\N
fa419312-1396-4a15-bc1f-c2363ec63010	5a2f20f7-1d2a-42e9-b65a-9521ff8dd8a6	Meta Ads	t	{"accessToken": "EAA66vRZA1HS0BP6LZAjssOl2FFU9i1pSCuwcbST77mUSAYkTujHffYpjWYZBQeXoKSgJbJRgvrLUTpV3qkTWHw2UAWb77sBvv93RADxGLWIoX8ERiGmF9vUZAPOp1TZBm0f5DzaDcZCYzEfCqEFSqmwUzxqXrZAuGFZCjP6dF1HZApBfji1E62SB22Wu1u9PPnSMHXjUZD", "adAccountId": "235252242319187"}	\N
a6242dc0-fba6-44fd-9f73-7e54f1dd8bb7	fdc892a7-d308-47b8-976a-6dc9f1eac27e	Meta Ads	t	{"accessToken": "EAA66vRZA1HS0BP6LZAjssOl2FFU9i1pSCuwcbST77mUSAYkTujHffYpjWYZBQeXoKSgJbJRgvrLUTpV3qkTWHw2UAWb77sBvv93RADxGLWIoX8ERiGmF9vUZAPOp1TZBm0f5DzaDcZCYzEfCqEFSqmwUzxqXrZAuGFZCjP6dF1HZApBfji1E62SB22Wu1u9PPnSMHXjUZD", "adAccountId": "718586248586722"}	\N
67c65e58-7ee3-4985-9185-0844a8745e86	2f3110f0-87be-4416-8797-32bd0d755596	Meta Ads	t	{"accessToken": "EAA66vRZA1HS0BP6LZAjssOl2FFU9i1pSCuwcbST77mUSAYkTujHffYpjWYZBQeXoKSgJbJRgvrLUTpV3qkTWHw2UAWb77sBvv93RADxGLWIoX8ERiGmF9vUZAPOp1TZBm0f5DzaDcZCYzEfCqEFSqmwUzxqXrZAuGFZCjP6dF1HZApBfji1E62SB22Wu1u9PPnSMHXjUZD", "adAccountId": "837221486760083"}	\N
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reports (id, client_id, name, date_range, platforms, generated_at, slug, description, content, is_public, created_by) FROM stdin;
b8a1eebc-c58b-4266-b30c-98efb673b27f	7d3eb02b-ba36-4b13-af1d-1706bd7c988f	Test Q4 Report	{"end": "2024-12-31", "start": "2024-10-01"}	{"Meta Ads","Google Ads"}	2025-11-03 22:01:56.260862	\N	\N	\N	t	\N
77a1db60-dd94-4e70-98b6-22760a3bd53d	d62f5b38-f080-4dbc-a56d-a3eb5499fcfc	Genco Oct 25 01	{"end": "2025-10-31", "start": "2025-10-01"}	{"Meta Ads"}	2025-11-03 22:04:46.430536	\N	\N	\N	t	\N
ac52e280-6782-4e5d-af7a-e9d48f3e0092	5a2f20f7-1d2a-42e9-b65a-9521ff8dd8a6	Q3-Q4 2025 Performance Analysis Report	\N	\N	2025-11-09 11:33:18.143132	q3-q4-2025-performance-analysis	Comprehensive 3-year historical comparison (2023-2025) analyzing revenue patterns, seasonal trends, and strategic recommendations for July-November 2025 performance.	# PERFORMANCE ANALYSIS REPORT: July - November 2025\n## 3-Year Historical Comparison (2023-2024-2025)\n\n---\n\n## EXECUTIVE SUMMARY\n\nYour October-November revenue decline is **partially normal seasonally, but significantly amplified by aggressive spend reduction**. Historical data from 2023-2024 confirms October-November softening is a recurring pattern, but your 2025 response has been 2-3x more severe than necessary.\n\n**The Good News:**\n- **2025 is your best year ever** by every metric: +189% revenue growth vs 2024, +29% ROAS improvement vs 2024\n- **November 2025 remains highly profitable** at 10.87x ROAS (you're generating £10.87 for every £1 spent)\n- **You're still outperforming historical November averages** by 3-4x in absolute revenue terms\n\n**The Concern:**\n- **October-November 2025 decline is 2x steeper** than historical patterns (-68% revenue vs -30% historical average)\n- **Spend cuts are too aggressive** (£7,980/day in Sept → £3,821/day in Nov = -52% reduction)\n- **November 2024 showed recovery potential** (6.76x ROAS with £1,864/day spend generated £12,602/day revenue)\n\n**Bottom Line:** This is **NOT a crisis** - it's a scaling optimization opportunity. You have room to increase spend profitably while the market is soft.\n\n---\n\n## TABLE 1: 2025 Month-by-Month Performance Summary\n\n| Month | Days | Total Spend | Total Revenue | Avg Daily Spend | Avg Daily Revenue | ROAS | Status |\n|-------|------|-------------|---------------|-----------------|-------------------|------|--------|\n| **July** | 31 | £176,667 | £2,307,224 | £5,699 | £74,427 | **13.06x** | Launch month ✅ |\n| **August** | 31 | £228,589 | £3,259,896 | £7,374 | £105,158 | **14.26x** | Strong growth 📈 |\n| **September** | 30 | £239,406 | £3,800,006 | £7,980 | £126,667 | **15.87x** | 🏆 PEAK PERFORMANCE |\n| **October** | 31 | £180,601 | £1,955,993 | £5,826 | £63,097 | **10.83x** | Sharp decline ⚠️ |\n| **November** | 9* | £34,111 | £371,596 | £3,790 | £41,288 | **10.87x** | Continued decline ⚠️ |\n| **TOTAL** | 132 | £859,375 | £11,694,715 | £6,510 | £88,596 | **13.61x** | Overall strong ✅ |\n\n*November data represents only first 9 days (Nov 1-9, 2025)*\n\n**Key Month-over-Month Changes:**\n- Sept → Oct: Revenue **-50.2%**, Spend **-27.0%**, ROAS **-31.8%**\n- Oct → Nov: Revenue **-34.6%**, Spend **-34.9%**, ROAS **+0.4%** (stabilized)\n\n---\n\n## KEY FINDINGS\n\n### Finding #1: October-November Decline is a Confirmed 3-Year Pattern ✅\n\n**Evidence:** All three years (2023, 2024, 2025) show revenue decline from peak summer months (Jul-Sep) to October-November period.\n\n**Historical Severity:**\n- 2023: -19.4% Sept→Nov decline (mild, with Nov recovery)\n- 2024: -67.6% Sept→Nov decline (severe, no recovery)\n- 2025: -67.4% Sept→Nov decline (severe, ongoing)\n\n**Conclusion:** This is **NOT a 2025-specific problem** - it's a consistent seasonal business pattern for your market/industry.\n\n---\n\n### Finding #2: Your 2025 "Decline" is Still 3-9x Better Than Historical Performance ✅\n\n**Absolute Performance Comparison:**\n\n| Metric | 2023 Nov | 2024 Nov | 2025 Nov (9d avg) | 2025 vs 2023 | 2025 vs 2024 |\n|--------|----------|----------|-------------------|--------------|--------------|\n| Daily Revenue | £9,000 | £12,602 | **£41,288** | **+359%** | **+228%** |\n| Daily Spend | £511 | £1,864 | **£3,790** | +642% | +103% |\n| ROAS | 17.6x | 6.76x | **10.87x** | -38% | **+61%** |\n\n**Conclusion:** Even in your "worst" month of 2025, you're generating **3-4x more daily revenue** than historical November averages.\n\n---\n\n## ACTIONABLE RECOMMENDATIONS\n\n### 🚨 IMMEDIATE ACTIONS (This Week)\n\n#### **Recommendation #1: Stabilize Daily Spend at £5,000-5,500/day**\n**Current State:** Nov 1-9 averaged £3,790/day spend\n**Target:** Increase to £5,000-5,500/day\n\n**Rationale:**\n- At 10.87x ROAS, spending £5,500/day generates £59,785/day revenue\n- This adds £1,710/day spend but generates £18,497/day additional revenue\n- Risk is minimal: Even if ROAS drops to 9x, you're still profitable\n\n---\n\n#### **Recommendation #2: Analyze Daily Variance to Find Winning Formula**\n\n| Date | Spend | Revenue | ROAS | Status |\n|------|-------|---------|------|--------|\n| Nov 3 | £3,782 | £65,180 | **17.23x** | 🏆 Best day |\n| Nov 7 | £5,120 | £73,054 | 14.27x | Strong day |\n| Nov 9 | £1,933 | £5,065 | **2.62x** | 💥 Worst day |\n\n**Action:** Identify which campaigns drove the 17.23x ROAS days and double down on those strategies.\n\n---\n\n*This report provides strategic analysis and recommendations based on 3 years of historical performance data. For full detailed analysis including all monthly comparisons and strategic playbooks, please contact your account manager.*	t	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, password, role, created_at) FROM stdin;
40c2343f-6344-477f-bef7-b568219d5d74	testadmin	4df56c143e38afff4c3d73da3e7cac9c83aad767718701e8aa5d87201bb94e9925b5bfa7ea98e4f2dd578b2db22e96410bc0f9a0b25f07a3b7c7f36c35a12c7b.03fe064f7b8d2c53788bb8a7f8ef636e	admin	2025-11-05 20:24:33.672782
15001065-7792-463a-9f90-32264e7f61b7	fnasr@admireworks.com	ac8729045c62268d0fb9e7d320d29d987e746a66648f6bc8330ea1d1127d2268ee51b3ae96c37f8b202a272d0557039389cc77994174640e3a51e06bb08d4e10.031930493fb86e2a03f737cc50327604	admin	2025-11-05 20:35:59.718777
\.


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: data_sync_jobs data_sync_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_sync_jobs
    ADD CONSTRAINT data_sync_jobs_pkey PRIMARY KEY (id);


--
-- Name: monthly_client_rollups monthly_client_rollups_client_id_platform_type_month_end_da_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_client_rollups
    ADD CONSTRAINT monthly_client_rollups_client_id_platform_type_month_end_da_key UNIQUE (client_id, platform_type, month_end_date);


--
-- Name: monthly_client_rollups monthly_client_rollups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_client_rollups
    ADD CONSTRAINT monthly_client_rollups_pkey PRIMARY KEY (id);


--
-- Name: monthly_data_overrides monthly_data_overrides_client_id_month_end_date_metric_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_data_overrides
    ADD CONSTRAINT monthly_data_overrides_client_id_month_end_date_metric_id_key UNIQUE (client_id, month_end_date, metric_id);


--
-- Name: monthly_data_overrides monthly_data_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_data_overrides
    ADD CONSTRAINT monthly_data_overrides_pkey PRIMARY KEY (id);


--
-- Name: monthly_platform_metrics monthly_platform_metrics_client_id_platform_month_end_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_platform_metrics
    ADD CONSTRAINT monthly_platform_metrics_client_id_platform_month_end_date_key UNIQUE (client_id, platform, month_end_date);


--
-- Name: monthly_platform_metrics monthly_platform_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_platform_metrics
    ADD CONSTRAINT monthly_platform_metrics_pkey PRIMARY KEY (id);


--
-- Name: overrides_audit overrides_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overrides_audit
    ADD CONSTRAINT overrides_audit_pkey PRIMARY KEY (id);


--
-- Name: platform_connections platform_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_connections
    ADD CONSTRAINT platform_connections_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: reports reports_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_slug_key UNIQUE (slug);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: data_sync_jobs data_sync_jobs_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_sync_jobs
    ADD CONSTRAINT data_sync_jobs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: monthly_client_rollups monthly_client_rollups_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_client_rollups
    ADD CONSTRAINT monthly_client_rollups_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: monthly_data_overrides monthly_data_overrides_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_data_overrides
    ADD CONSTRAINT monthly_data_overrides_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: monthly_data_overrides monthly_data_overrides_edited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_data_overrides
    ADD CONSTRAINT monthly_data_overrides_edited_by_fkey FOREIGN KEY (edited_by) REFERENCES public.users(id);


--
-- Name: monthly_platform_metrics monthly_platform_metrics_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_platform_metrics
    ADD CONSTRAINT monthly_platform_metrics_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: overrides_audit overrides_audit_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overrides_audit
    ADD CONSTRAINT overrides_audit_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: overrides_audit overrides_audit_edited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overrides_audit
    ADD CONSTRAINT overrides_audit_edited_by_fkey FOREIGN KEY (edited_by) REFERENCES public.users(id);


--
-- Name: overrides_audit overrides_audit_override_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overrides_audit
    ADD CONSTRAINT overrides_audit_override_id_fkey FOREIGN KEY (override_id) REFERENCES public.monthly_data_overrides(id) ON DELETE SET NULL;


--
-- Name: platform_connections platform_connections_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_connections
    ADD CONSTRAINT platform_connections_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: reports reports_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


