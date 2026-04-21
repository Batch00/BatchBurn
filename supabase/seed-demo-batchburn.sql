-- Replace <DEMO_UUID> with demo user UUID before running

-- Shoes
INSERT INTO batchburn.shoes (id, user_id, name, price, initial_miles, purchase_date, is_active, created_at) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '<DEMO_UUID>', 'Nike Pegasus', 130, 0, '2025-01-01', true, now()),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', '<DEMO_UUID>', 'Brooks Ghost', 140, 0, '2025-06-01', true, now()),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', '<DEMO_UUID>', 'Hoka Clifton', 145, 0, '2025-10-01', true, now());

-- Runs (30 realistic runs Nov 2025 - Apr 2026)
INSERT INTO batchburn.runs (id, user_id, date, distance_miles, distance_km, duration_seconds, pace_per_mile_seconds, run_type, shoe_id, source, created_at) VALUES
  ('d4e5f6a7-b8c9-0123-defa-234567890123', '<DEMO_UUID>', '2025-11-03', 4.5, 7.24, 2430, 540, 'Easy', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'import', now()),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', '<DEMO_UUID>', '2025-11-05', 8.0, 12.87, 4480, 560, 'Long', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'import', now()),
  ('f6a7b8c9-d0e1-2345-fabc-456789012345', '<DEMO_UUID>', '2025-11-07', 5.0, 8.05, 2700, 540, 'Easy', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'import', now()),
  ('a7b8c9d0-e1f2-3456-abcd-567890123456', '<DEMO_UUID>', '2025-11-10', 4.0, 6.44, 1860, 465, 'Tempo', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'import', now()),
  ('b8c9d0e1-f2a3-4567-bcde-678901234567', '<DEMO_UUID>', '2025-11-12', 6.0, 9.66, 3300, 550, 'Easy', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'import', now()),
  ('c9d0e1f2-a3b4-5678-cdef-789012345678', '<DEMO_UUID>', '2025-11-15', 10.0, 16.09, 5600, 560, 'Long', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'import', now()),
  ('d0e1f2a3-b4c5-6789-defa-890123456789', '<DEMO_UUID>', '2025-11-18', 3.5, 5.63, 1890, 540, 'Easy', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'import', now()),
  ('e1f2a3b4-c5d6-7890-efab-901234567890', '<DEMO_UUID>', '2025-11-20', 5.5, 8.85, 2970, 540, 'Easy', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'import', now()),
  ('f2a3b4c5-d6e7-8901-fabc-012345678901', '<DEMO_UUID>', '2025-11-22', 8.0, 12.87, 4680, 585, 'Long', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'import', now()),
  ('a3b4c5d6-e7f8-9012-abcd-123456789012', '<DEMO_UUID>', '2025-11-25', 4.0, 6.44, 1920, 480, 'Tempo', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'import', now()),
  ('b4c5d6e7-f8a9-0123-bcde-234567890123', '<DEMO_UUID>', '2025-11-27', 5.0, 8.05, 2700, 540, 'Easy', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'import', now()),
  ('c5d6e7f8-a9b0-1234-cdef-345678901234', '<DEMO_UUID>', '2025-12-01', 12.0, 19.31, 6720, 560, 'Long', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'import', now()),
  ('d6e7f8a9-b0c1-2345-defa-456789012345', '<DEMO_UUID>', '2025-12-03', 4.5, 7.24, 2430, 540, 'Easy', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'import', now()),
  ('e7f8a9b0-c1d2-3456-efab-567890123456', '<DEMO_UUID>', '2025-12-06', 6.0, 9.66, 2880, 480, 'Tempo', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'import', now()),
  ('f8a9b0c1-d2e3-4567-fabc-678901234567', '<DEMO_UUID>', '2025-12-09', 5.0, 8.05, 2700, 540, 'Easy', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'import', now()),
  ('a9b0c1d2-e3f4-5678-abcd-789012345678', '<DEMO_UUID>', '2025-12-13', 13.1, 21.08, 7427, 567, 'Long', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'import', now()),
  ('b0c1d2e3-f4a5-6789-bcde-890123456789', '<DEMO_UUID>', '2025-12-16', 4.0, 6.44, 1860, 465, 'Tempo', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'import', now()),
  ('c1d2e3f4-a5b6-7890-cdef-901234567890', '<DEMO_UUID>', '2025-12-18', 6.0, 9.66, 3300, 550, 'Easy', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'import', now()),
  ('d2e3f4a5-b6c7-8901-defa-012345678901', '<DEMO_UUID>', '2026-01-04', 5.0, 8.05, 2700, 540, 'Easy', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'import', now()),
  ('e3f4a5b6-c7d8-9012-efab-123456789012', '<DEMO_UUID>', '2026-01-07', 8.0, 12.87, 4640, 580, 'Long', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'import', now()),
  ('f4a5b6c7-d8e9-0123-fabc-234567890123', '<DEMO_UUID>', '2026-01-10', 4.0, 6.44, 1920, 480, 'Tempo', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'import', now()),
  ('a5b6c7d8-e9f0-1234-abcd-345678901234', '<DEMO_UUID>', '2026-01-14', 6.0, 9.66, 3300, 550, 'Easy', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'import', now()),
  ('b6c7d8e9-f0a1-2345-bcde-456789012345', '<DEMO_UUID>', '2026-01-18', 10.0, 16.09, 5700, 570, 'Long', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'import', now()),
  ('c7d8e9f0-a1b2-3456-cdef-567890123456', '<DEMO_UUID>', '2026-01-22', 5.0, 8.05, 2700, 540, 'Easy', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'import', now()),
  ('d8e9f0a1-b2c3-4567-defa-678901234567', '<DEMO_UUID>', '2026-02-03', 4.5, 7.24, 2115, 470, 'Tempo', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'import', now()),
  ('e9f0a1b2-c3d4-5678-efab-789012345678', '<DEMO_UUID>', '2026-02-08', 12.0, 19.31, 6840, 570, 'Long', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'import', now()),
  ('f0a1b2c3-d4e5-6789-fabc-890123456789', '<DEMO_UUID>', '2026-02-12', 5.0, 8.05, 2700, 540, 'Easy', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'import', now()),
  ('a1b2c3d4-e5f6-7890-abcd-890123456789', '<DEMO_UUID>', '2026-03-01', 6.0, 9.66, 3300, 550, 'Easy', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'import', now()),
  ('b2c3d4e5-f6a7-8901-bcde-901234567890', '<DEMO_UUID>', '2026-03-08', 13.1, 21.08, 7296, 557, 'Long', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'import', now()),
  ('c3d4e5f6-a7b8-9012-cdef-012345678901', '<DEMO_UUID>', '2026-04-05', 5.0, 8.05, 2700, 540, 'Easy', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'import', now());

-- Cross training sessions (15 sessions)
INSERT INTO batchburn.cross_training (id, user_id, date, activity_type, duration_seconds, distance_miles, notes, source, created_at) VALUES
  ('d4e5f6a7-b8c9-0123-defa-111111111111', '<DEMO_UUID>', '2025-11-04', 'Bike', 2700, 12.5, 'Easy spin', 'import', now()),
  ('e5f6a7b8-c9d0-1234-efab-111111111111', '<DEMO_UUID>', '2025-11-09', 'Walk', 2100, 2.2, null, 'import', now()),
  ('f6a7b8c9-d0e1-2345-fabc-111111111111', '<DEMO_UUID>', '2025-11-13', 'Stair Master', 1800, null, '20 floors', 'import', now()),
  ('a7b8c9d0-e1f2-3456-abcd-111111111111', '<DEMO_UUID>', '2025-11-17', 'Bike', 3600, 15.0, 'Longer ride', 'import', now()),
  ('b8c9d0e1-f2a3-4567-bcde-111111111111', '<DEMO_UUID>', '2025-11-24', 'Strength', 2700, null, 'Upper body', 'import', now()),
  ('c9d0e1f2-a3b4-5678-cdef-111111111111', '<DEMO_UUID>', '2025-11-29', 'Walk', 1800, 1.8, null, 'import', now()),
  ('d0e1f2a3-b4c5-6789-defa-111111111111', '<DEMO_UUID>', '2025-12-04', 'Bike', 3000, 13.0, null, 'import', now()),
  ('e1f2a3b4-c5d6-7890-efab-111111111111', '<DEMO_UUID>', '2025-12-08', 'Stair Master', 1500, null, null, 'import', now()),
  ('f2a3b4c5-d6e7-8901-fabc-111111111111', '<DEMO_UUID>', '2025-12-12', 'Strength', 3600, null, 'Full body', 'import', now()),
  ('a3b4c5d6-e7f8-9012-abcd-111111111111', '<DEMO_UUID>', '2025-12-20', 'Walk', 2400, 2.5, 'Holiday walk', 'import', now()),
  ('b4c5d6e7-f8a9-0123-bcde-111111111111', '<DEMO_UUID>', '2026-01-06', 'Bike', 2700, 11.0, null, 'import', now()),
  ('c5d6e7f8-a9b0-1234-cdef-111111111111', '<DEMO_UUID>', '2026-01-15', 'Stair Master', 1800, null, null, 'import', now()),
  ('d6e7f8a9-b0c1-2345-defa-111111111111', '<DEMO_UUID>', '2026-02-01', 'Strength', 2700, null, 'Core focus', 'import', now()),
  ('e7f8a9b0-c1d2-3456-efab-111111111111', '<DEMO_UUID>', '2026-02-15', 'Bike', 3600, 14.5, 'Good ride', 'import', now()),
  ('f8a9b0c1-d2e3-4567-fabc-111111111111', '<DEMO_UUID>', '2026-03-15', 'Walk', 2700, 3.0, null, 'import', now());

-- Goals
INSERT INTO batchburn.goals (id, user_id, goal_type, period, target_value, is_active, created_at) VALUES
  (gen_random_uuid(), '<DEMO_UUID>', 'mileage', 'week', 20, true, now()),
  (gen_random_uuid(), '<DEMO_UUID>', 'mileage', 'year', 500, true, now());
