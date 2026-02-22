-- Demo seed for local development only.
-- Replace owner_id with actual demo user UUID after setup.
INSERT INTO boards (id, owner_id, title) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'Product Roadmap Q1 — Demo');

INSERT INTO cards (board_id, type, x, y, width, height, content, color_index) VALUES
  ('00000000-0000-0000-0000-000000000001', 'sticky', 60, 50, 200, 150, 'User Research\n\nInterview customers\nAnalyze feedback', 0),
  ('00000000-0000-0000-0000-000000000001', 'sticky', 300, 70, 200, 150, 'Design Sprint\n\nWireframes\nPrototype v1', 1),
  ('00000000-0000-0000-0000-000000000001', 'sticky', 540, 50, 200, 150, 'Development\n\nMVP features\nAPI integration', 2),
  ('00000000-0000-0000-0000-000000000001', 'sticky', 780, 70, 200, 150, 'Launch\n\nBeta release\nGather feedback', 3),
  ('00000000-0000-0000-0000-000000000001', 'sticky', 160, 260, 200, 150, 'Priority: HIGH\n\nCore features only', 4);
