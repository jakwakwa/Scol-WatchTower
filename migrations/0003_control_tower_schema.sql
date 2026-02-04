-- Control Tower Schema Migration
-- PRD: StratCol Onboarding Control Tower

-- Add business type to applicants for conditional document logic
ALTER TABLE applicants ADD COLUMN business_type TEXT;

-- Add workflow completion and termination tracking
ALTER TABLE workflows ADD COLUMN completed_at INTEGER;
ALTER TABLE workflows ADD COLUMN terminated_at INTEGER;
ALTER TABLE workflows ADD COLUMN terminated_by TEXT;
ALTER TABLE workflows ADD COLUMN termination_reason TEXT;

-- Add parallel processing state tracking
ALTER TABLE workflows ADD COLUMN procurement_cleared INTEGER;
ALTER TABLE workflows ADD COLUMN documents_complete INTEGER;
ALTER TABLE workflows ADD COLUMN ai_analysis_complete INTEGER;
