-- =============================================================
-- Voice Booking Agent — Core Schema
-- Migration: 001
-- =============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- TABLES
-- =============================================================

CREATE TABLE businesses (
    business_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name     TEXT NOT NULL,
    business_type     TEXT NOT NULL CHECK (business_type IN ('car_detailing', 'cleaning')),
    timezone          TEXT NOT NULL DEFAULT 'Australia/Melbourne',
    provider_email    TEXT NOT NULL,
    twilio_number     TEXT,
    calendar_id       TEXT,
    config            JSONB,
    active            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------

CREATE TABLE services (
    service_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id             UUID NOT NULL REFERENCES businesses(business_id) ON DELETE CASCADE,
    keypad_option           INT NOT NULL,
    service_code            TEXT NOT NULL,
    name_en                 TEXT NOT NULL,
    name_hi                 TEXT,
    name_zh                 TEXT,
    duration_minutes        INT NOT NULL,
    base_price_min          NUMERIC(10,2),
    base_price_max          NUMERIC(10,2),
    manual_review_required  BOOLEAN NOT NULL DEFAULT FALSE,
    active                  BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (business_id, keypad_option),
    UNIQUE (business_id, service_code)
);

-- -------------------------------------------------------------

CREATE TABLE customers (
    customer_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name            TEXT,
    phone                TEXT NOT NULL UNIQUE,
    email                TEXT,
    preferred_language   TEXT NOT NULL DEFAULT 'en',
    created_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------

CREATE TABLE bookings (
    booking_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id         UUID NOT NULL REFERENCES businesses(business_id),
    customer_id         UUID NOT NULL REFERENCES customers(customer_id),
    service_id          UUID NOT NULL REFERENCES services(service_id),
    status              TEXT NOT NULL DEFAULT 'confirmed'
                            CHECK (status IN ('confirmed', 'cancelled', 'completed', 'rescheduled', 'pending')),
    scheduled_start     TIMESTAMP,
    scheduled_end       TIMESTAMP,
    address_line        TEXT,
    suburb              TEXT,
    quote_min           NUMERIC(10,2),
    quote_max           NUMERIC(10,2),
    final_price         NUMERIC(10,2),
    notes               TEXT,
    calendar_event_id   TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------

CREATE TABLE calls (
    call_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id           UUID REFERENCES businesses(business_id),
    twilio_call_sid       TEXT UNIQUE,
    caller_phone          TEXT,
    language_code         TEXT NOT NULL DEFAULT 'en',
    current_state         TEXT NOT NULL DEFAULT 'LANGUAGE_MENU',
    transcript            TEXT,
    intent                TEXT,
    selected_service_code TEXT,
    booking_id            UUID REFERENCES bookings(booking_id),
    outcome               TEXT,
    created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------

CREATE TABLE booking_events (
    event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      UUID NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    event_type      TEXT NOT NULL,
    event_payload   JSONB,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------

CREATE TABLE availability_rules (
    rule_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id   UUID NOT NULL REFERENCES businesses(business_id) ON DELETE CASCADE,
    weekday       INT NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
    start_time    TIME NOT NULL,
    end_time      TIME NOT NULL,
    slot_minutes  INT NOT NULL DEFAULT 60,
    active        BOOLEAN NOT NULL DEFAULT TRUE
);

-- -------------------------------------------------------------

CREATE TABLE notification_log (
    notification_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id        UUID REFERENCES bookings(booking_id),
    recipient_type    TEXT NOT NULL CHECK (recipient_type IN ('customer', 'provider')),
    channel           TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
    subject           TEXT,
    body              TEXT,
    sent_at           TIMESTAMP,
    status            TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'sent', 'failed'))
);

-- -------------------------------------------------------------

CREATE TABLE callback_requests (
    callback_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID REFERENCES businesses(business_id),
    phone           TEXT,
    language_code   TEXT,
    reason          TEXT,
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'contacted', 'resolved')),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================================================
-- INDEXES
-- =============================================================

-- calls
CREATE INDEX idx_calls_twilio_sid    ON calls(twilio_call_sid);
CREATE INDEX idx_calls_caller_phone  ON calls(caller_phone);
CREATE INDEX idx_calls_state         ON calls(current_state);

-- bookings
CREATE INDEX idx_bookings_status          ON bookings(status);
CREATE INDEX idx_bookings_scheduled_start ON bookings(scheduled_start);
CREATE INDEX idx_bookings_customer_id     ON bookings(customer_id);
CREATE INDEX idx_bookings_business_id     ON bookings(business_id);

-- customers
CREATE INDEX idx_customers_phone ON customers(phone);

-- callback_requests
CREATE INDEX idx_callbacks_status ON callback_requests(status);

-- =============================================================
-- SEED DATA
-- =============================================================

-- ── Demo Business 1: Car Detailing ───────────────────────────
INSERT INTO businesses (
    business_id, business_name, business_type,
    provider_email, twilio_number, calendar_id, config
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Shine Mobile Detailing',
    'car_detailing',
    'provider@shinemobile.com.au',
    '+61400000001',
    'shine_calendar@group.calendar.google.com',
    '{
        "languages": ["en", "hi", "zh"],
        "provider_daily_summary_time": "16:30",
        "customer_reminder_hours_before": 24,
        "provider_reminder_hours_before": 24,
        "main_menu": {
            "1": "new_booking",
            "2": "check_availability",
            "3": "get_quote",
            "4": "change_booking",
            "5": "cancel_booking",
            "6": "leave_message"
        }
    }'::jsonb
);

-- Services for Shine Mobile Detailing
INSERT INTO services (business_id, keypad_option, service_code, name_en, name_hi, name_zh, duration_minutes, base_price_min, base_price_max, manual_review_required) VALUES
    ('11111111-1111-1111-1111-111111111111', 1, 'EXT_WASH',      'Exterior Wash',          'बाहरी धुलाई',       '外部清洗',   60,   80.00,  120.00, FALSE),
    ('11111111-1111-1111-1111-111111111111', 2, 'INT_DETAIL',    'Interior Detail',        'आंतरिक डिटेलिंग',  '内部细节',   90,  120.00,  180.00, FALSE),
    ('11111111-1111-1111-1111-111111111111', 3, 'FULL_DETAIL',   'Full Detail',            'पूर्ण डिटेलिंग',   '全面细节',  180,  250.00,  400.00, FALSE),
    ('11111111-1111-1111-1111-111111111111', 4, 'PRESALE_DETAIL','Pre-Sale Detail',        'बिक्री पूर्व',      '售前细节',  240,  350.00,  500.00, FALSE),
    ('11111111-1111-1111-1111-111111111111', 5, 'CERAMIC',       'Ceramic Coating Enquiry','सिरेमिक कोटिंग',   '陶瓷涂层',   60,    0.00,    0.00, TRUE);

-- Availability rules for Shine Mobile Detailing (Mon–Sat, 8 AM – 5 PM)
INSERT INTO availability_rules (business_id, weekday, start_time, end_time, slot_minutes) VALUES
    ('11111111-1111-1111-1111-111111111111', 1, '08:00', '17:00', 60),
    ('11111111-1111-1111-1111-111111111111', 2, '08:00', '17:00', 60),
    ('11111111-1111-1111-1111-111111111111', 3, '08:00', '17:00', 60),
    ('11111111-1111-1111-1111-111111111111', 4, '08:00', '17:00', 60),
    ('11111111-1111-1111-1111-111111111111', 5, '08:00', '17:00', 60),
    ('11111111-1111-1111-1111-111111111111', 6, '09:00', '15:00', 60);

-- ── Demo Business 2: Cleaning ─────────────────────────────────
INSERT INTO businesses (
    business_id, business_name, business_type,
    provider_email, twilio_number, calendar_id, config
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    'SparkClean Services',
    'cleaning',
    'provider@sparkclean.com.au',
    '+61400000002',
    'sparkclean_calendar@group.calendar.google.com',
    '{
        "languages": ["en", "hi", "zh"],
        "provider_daily_summary_time": "16:30",
        "customer_reminder_hours_before": 24,
        "provider_reminder_hours_before": 24,
        "main_menu": {
            "1": "new_booking",
            "2": "check_availability",
            "3": "get_quote",
            "4": "change_booking",
            "5": "cancel_booking",
            "6": "leave_message"
        }
    }'::jsonb
);

-- Services for SparkClean Services
INSERT INTO services (business_id, keypad_option, service_code, name_en, name_hi, name_zh, duration_minutes, base_price_min, base_price_max) VALUES
    ('22222222-2222-2222-2222-222222222222', 1, 'REGULAR_CLEAN',  'Regular Cleaning',       'नियमित सफाई',        '定期清洁',    120,   80.00,  150.00),
    ('22222222-2222-2222-2222-222222222222', 2, 'DEEP_CLEAN',     'Deep Cleaning',          'गहरी सफाई',          '深度清洁',    240,  200.00,  400.00),
    ('22222222-2222-2222-2222-222222222222', 3, 'END_OF_LEASE',   'End of Lease Cleaning',  'लीज समाप्ति सफाई',   '租约结束清洁', 360,  350.00,  600.00),
    ('22222222-2222-2222-2222-222222222222', 4, 'AIRBNB_TURNOVER','Airbnb Turnover',        'एयरबीएनबी',          '爱彼迎翻转',  120,  100.00,  200.00),
    ('22222222-2222-2222-2222-222222222222', 5, 'OFFICE_CLEAN',   'Office Cleaning',        'कार्यालय सफाई',      '办公室清洁',  180,  150.00,  300.00);

-- Availability rules for SparkClean Services (Mon–Fri, 7 AM – 6 PM)
INSERT INTO availability_rules (business_id, weekday, start_time, end_time, slot_minutes) VALUES
    ('22222222-2222-2222-2222-222222222222', 1, '07:00', '18:00', 60),
    ('22222222-2222-2222-2222-222222222222', 2, '07:00', '18:00', 60),
    ('22222222-2222-2222-2222-222222222222', 3, '07:00', '18:00', 60),
    ('22222222-2222-2222-2222-222222222222', 4, '07:00', '18:00', 60),
    ('22222222-2222-2222-2222-222222222222', 5, '07:00', '18:00', 60);
