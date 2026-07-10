INSERT INTO site_setting (id, key, value) VALUES ('adm-email','adminEmail','admin@localhost') ON CONFLICT(key) DO UPDATE SET value=excluded.value;
INSERT INTO site_setting (id, key, value) VALUES ('adm-name','adminName','博主') ON CONFLICT(key) DO UPDATE SET value=excluded.value;
INSERT INTO site_setting (id, key, value) VALUES ('adm-pass','adminPassword','$2b$10$ei4UwQGcKmlLse9AI5EsGu0gISy/GfUojbR48Mf7MtvJIgAEyDRc.') ON CONFLICT(key) DO UPDATE SET value=excluded.value;
