-- Flyway Migration V16__seed_knowledge_article_types.sql
-- Seeds Knowledge Article Document Types into PostgreSQL

INSERT INTO document_types (id, name, description)
VALUES 
    (gen_random_uuid(), 'SOP', 'Standard Operating Procedure document'),
    (gen_random_uuid(), 'Article', 'Knowledge base article'),
    (gen_random_uuid(), 'Guide', 'Step-by-step technical guide'),
    (gen_random_uuid(), 'Troubleshooting', 'Troubleshooting guide')
ON CONFLICT (name) DO NOTHING;
