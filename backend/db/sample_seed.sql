-- 手動適用用のサンプルデータ投入スクリプト（マイグレーション非対象）
CREATE TABLE IF NOT EXISTS sample (
  id INTEGER PRIMARY KEY,
  objects TEXT NOT NULL
);

DELETE FROM sample;
INSERT INTO sample (id, objects) VALUES (1, 'todo');
