-- Programs: forking columns
ALTER TABLE programs ADD COLUMN is_template boolean NOT NULL DEFAULT true;
ALTER TABLE programs ADD COLUMN athlete_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE programs ADD COLUMN parent_program_id uuid REFERENCES programs(id) ON DELETE SET NULL;

-- Diet Templates: forking columns
ALTER TABLE diet_templates ADD COLUMN is_template boolean NOT NULL DEFAULT true;
ALTER TABLE diet_templates ADD COLUMN athlete_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE diet_templates ADD COLUMN parent_template_id uuid REFERENCES diet_templates(id) ON DELETE SET NULL;

-- Performance indices for is_template filtering
CREATE INDEX idx_programs_is_template ON programs(is_template);
CREATE INDEX idx_diet_templates_is_template ON diet_templates(is_template);