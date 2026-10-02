INSERT INTO categories(name, sort)
SELECT seed.name, seed.sort
FROM (VALUES ('Fruits', 1), ('Vegetables', 2)) AS seed(name, sort)
WHERE NOT EXISTS (
  SELECT 1 FROM categories existing WHERE existing.name = seed.name
);

-- Keep the first existing row for each item name, then enforce idempotent seeding.
DELETE FROM items older
USING items newer
WHERE older.name = newer.name
  AND older.id < newer.id;

CREATE UNIQUE INDEX IF NOT EXISTS items_name_key ON items(name);

INSERT INTO items(name, name_ur, description, price, unit, image_url, tag, available, category_id)
VALUES
  ('Apple', 'سیب', 'Fresh red apples', 180, 'kg', 'https://images.unsplash.com/photo-1630563451961-ac2ff27616ab?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Fruits' ORDER BY sort LIMIT 1)),
  ('Banana', 'کیلا', 'Ripe yellow bananas', 120, 'dozen', 'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Fruits' ORDER BY sort LIMIT 1)),
  ('Orange', 'سانگرہ', 'Juicy sweet oranges', 200, 'kg', 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Fruits' ORDER BY sort LIMIT 1)),
  ('Strawberry', 'اسٹرابیری', 'Fresh red strawberries', 400, 'kg', 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Fruits' ORDER BY sort LIMIT 1)),
  ('Mango', 'آم', 'Sweet king mangoes', 250, 'kg', 'https://images.unsplash.com/photo-1673010960635-d0d1ad81b90a?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Fruits' ORDER BY sort LIMIT 1)),
  ('Grapes', 'انگور', 'Seedless grapes', 300, 'kg', 'https://images.unsplash.com/photo-1596363505729-4190a9506133?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Fruits' ORDER BY sort LIMIT 1)),
  ('Watermelon', 'تربوز', 'Refreshing summer watermelon', 80, 'kg', 'https://images.unsplash.com/photo-1595475207225-428b62bda831?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Fruits' ORDER BY sort LIMIT 1)),
  ('Pineapple', 'انناس', 'Tropical sweet pineapple', 350, 'kg', 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Fruits' ORDER BY sort LIMIT 1)),
  ('Kiwi', 'کیوی', 'Tangy green kiwis', 500, 'kg', 'https://images.unsplash.com/photo-1679065103638-7360cb935fac?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Fruits' ORDER BY sort LIMIT 1)),
  ('Peach', 'آڑو', 'Soft juicy peaches', 280, 'kg', 'https://images.unsplash.com/photo-1629828874514-c1e5103f2150?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Fruits' ORDER BY sort LIMIT 1)),
  ('Cherry', 'چیری', 'Sweet red cherries', 1200, 'kg', 'https://images.unsplash.com/photo-1528821154947-1aa3d1b74941?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Fruits' ORDER BY sort LIMIT 1)),
  ('Pear', 'ناشپاتی', 'Crisp juicy pears', 220, 'kg', 'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Fruits' ORDER BY sort LIMIT 1)),
  ('Lemon', 'لیموں', 'Sour yellow lemons', 100, 'kg', 'https://images.unsplash.com/flagged/photo-1587302164675-820fe61bbd55?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Fruits' ORDER BY sort LIMIT 1)),
  ('Guava', 'امروڈ', 'Fresh guavas', 150, 'kg', 'https://images.unsplash.com/photo-1693399991519-bef70bed19a2?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Fruits' ORDER BY sort LIMIT 1)),
  ('Papaya', 'پپیتا', 'Ripe orange papaya', 120, 'kg', 'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Fruits' ORDER BY sort LIMIT 1)),
  ('Pomegranate', 'انار', 'Ruby red pomegranate', 300, 'kg', 'https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Fruits' ORDER BY sort LIMIT 1)),
  ('Apricot', 'خوبانی', 'Sweet golden apricots', 400, 'kg', 'https://images.unsplash.com/photo-1784015560266-4a7b356a3016?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Fruits' ORDER BY sort LIMIT 1)),
  ('Plum', 'آلوچہ', 'Juicy purple plums', 350, 'kg', 'https://images.unsplash.com/photo-1564750497011-ead0ce4b9448?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Fruits' ORDER BY sort LIMIT 1)),
  ('Blueberry', 'بلی بیری', 'Fresh blueberries', 1500, 'kg', 'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Fruits' ORDER BY sort LIMIT 1)),
  ('Lychee', 'لیچی', 'Sweet translucent lychee', 800, 'kg', 'https://images.unsplash.com/photo-1597975371270-cf80e4f54921?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Fruits' ORDER BY sort LIMIT 1)),
  ('Tomato', 'ٹماٹر', 'Fresh red tomatoes', 80, 'kg', 'https://images.unsplash.com/photo-1582284540020-8acbe03f4924?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Vegetables' ORDER BY sort LIMIT 1)),
  ('Potato', 'آلو', 'Premium quality potatoes', 60, 'kg', 'https://images.unsplash.com/photo-1590165482129-1b8b27698780?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Vegetables' ORDER BY sort LIMIT 1)),
  ('Carrot', 'گاجر', 'Crunchy orange carrots', 70, 'kg', 'https://images.unsplash.com/photo-1590868309235-ea34bed7bd7f?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Vegetables' ORDER BY sort LIMIT 1)),
  ('Onion', 'پیاز', 'Fresh onions', 50, 'kg', 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Vegetables' ORDER BY sort LIMIT 1)),
  ('Cucumber', 'کھیرا', 'Crisp green cucumber', 90, 'kg', 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Vegetables' ORDER BY sort LIMIT 1)),
  ('Spinach', 'پالک', 'Fresh green spinach leaves', 40, 'kg', 'https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Vegetables' ORDER BY sort LIMIT 1)),
  ('Broccoli', 'بروکلی', 'Green fresh broccoli', 200, 'kg', 'https://images.unsplash.com/photo-1685504445355-0e7bdf90d415?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Vegetables' ORDER BY sort LIMIT 1)),
  ('Cauliflower', 'گوبھی', 'White fresh cauliflower', 120, 'kg', 'https://images.unsplash.com/photo-1566842600175-97dca489844f?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Vegetables' ORDER BY sort LIMIT 1)),
  ('Bell Pepper', 'شملہ مرچ', 'Fresh red bell pepper', 180, 'kg', 'https://images.unsplash.com/photo-1525607551316-4a8e16d1f9ba?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Vegetables' ORDER BY sort LIMIT 1)),
  ('Eggplant', 'بینگن', 'Purple fresh eggplant', 70, 'kg', 'https://images.unsplash.com/photo-1528826007177-f38517ce9a8a?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Vegetables' ORDER BY sort LIMIT 1)),
  ('Mushroom', 'مشروم', 'Fresh mushrooms', 300, 'kg', 'https://images.unsplash.com/photo-1504545102780-26774c1bb073?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Vegetables' ORDER BY sort LIMIT 1)),
  ('Chili Pepper', 'مرچ', 'Spicy red chili', 100, 'kg', 'https://images.unsplash.com/photo-1526346698789-22fd84314424?auto=format&fit=crop&w=600&q=80', 'fresh', true, (SELECT id FROM categories WHERE name = 'Vegetables' ORDER BY sort LIMIT 1))
ON CONFLICT (name) DO UPDATE SET
  name_ur = EXCLUDED.name_ur,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  category_id = EXCLUDED.category_id;
