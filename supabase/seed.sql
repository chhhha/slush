-- 슬러시 통 초기 데이터 (3개 층 x 2개 통 = 6개)
INSERT INTO machines (floor, position, flavor, status) VALUES
  (2, 'left',  '', 'preparing'),
  (2, 'right', '', 'preparing'),
  (3, 'left',  '', 'preparing'),
  (3, 'right', '', 'preparing'),
  (4, 'left',  '', 'preparing'),
  (4, 'right', '', 'preparing')
ON CONFLICT (floor, position) DO NOTHING;
