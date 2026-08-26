export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          execution_note: string | null
          final_warning_at: string
          id: string
          reason: string | null
          recoverable_until: string
          requested_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          execution_note?: string | null
          final_warning_at: string
          id?: string
          reason?: string | null
          recoverable_until: string
          requested_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          execution_note?: string | null
          final_warning_at?: string
          id?: string
          reason?: string | null
          recoverable_until?: string
          requested_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_access_links: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          expires_at: string | null
          id: string
          requested_role: string
          status: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string | null
          id?: string
          requested_role?: string
          status?: string
          token_hash: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          requested_role?: string
          status?: string
          token_hash?: string
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          reason: string | null
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: []
      }
      banned_terms: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          term: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          term: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          term?: string
        }
        Relationships: []
      }
      billing_customers: {
        Row: {
          created_at: string
          email: string | null
          stripe_customer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          stripe_customer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          stripe_customer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blueprint_versions: {
        Row: {
          blueprint_name: string
          category: string
          change_reason: string
          cluster: string
          created_at: string
          created_by: string | null
          distribution: Json
          id: string
          level: string
          status: string
          total_questions: number
          version: string
        }
        Insert: {
          blueprint_name: string
          category: string
          change_reason: string
          cluster: string
          created_at?: string
          created_by?: string | null
          distribution?: Json
          id?: string
          level: string
          status?: string
          total_questions?: number
          version: string
        }
        Update: {
          blueprint_name?: string
          category?: string
          change_reason?: string
          cluster?: string
          created_at?: string
          created_by?: string | null
          distribution?: Json
          id?: string
          level?: string
          status?: string
          total_questions?: number
          version?: string
        }
        Relationships: []
      }
      deca_batch_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          failed_count: number
          id: string
          import_offset: number
          imported_count: number
          input_file_id: string | null
          metadata: Json
          openai_batch_id: string | null
          output_file_id: string | null
          row_count: number
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          failed_count?: number
          id?: string
          import_offset?: number
          imported_count?: number
          input_file_id?: string | null
          metadata?: Json
          openai_batch_id?: string | null
          output_file_id?: string | null
          row_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          failed_count?: number
          id?: string
          import_offset?: number
          imported_count?: number
          input_file_id?: string | null
          metadata?: Json
          openai_batch_id?: string | null
          output_file_id?: string | null
          row_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      duplicate_question_reviews: {
        Row: {
          candidate_hash: string
          candidate_question: Json
          created_at: string
          id: string
          matching_question_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          similarity: number
          status: string
        }
        Insert: {
          candidate_hash: string
          candidate_question: Json
          created_at?: string
          id?: string
          matching_question_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          similarity?: number
          status?: string
        }
        Update: {
          candidate_hash?: string
          candidate_question?: Json
          created_at?: string
          id?: string
          matching_question_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          similarity?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "duplicate_question_reviews_matching_question_id_fkey"
            columns: ["matching_question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_question_candidates: {
        Row: {
          batch_job_id: string | null
          category: string | null
          correct_option_id: string
          created_at: string
          difficulty: string
          explanation: string | null
          id: string
          import_identity: string | null
          options: Json
          partition_keys: Json
          performance_indicator: string | null
          published_question_id: string | null
          quality_score: number | null
          question_hash: string | null
          question_text: string
          question_type: string
          raw_response: Json
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_custom_id: string | null
          tags: string[]
          updated_at: string
          validation_errors: string[]
          validation_status: string
        }
        Insert: {
          batch_job_id?: string | null
          category?: string | null
          correct_option_id: string
          created_at?: string
          difficulty: string
          explanation?: string | null
          id?: string
          import_identity?: string | null
          options: Json
          partition_keys?: Json
          performance_indicator?: string | null
          published_question_id?: string | null
          quality_score?: number | null
          question_hash?: string | null
          question_text: string
          question_type: string
          raw_response?: Json
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_custom_id?: string | null
          tags?: string[]
          updated_at?: string
          validation_errors?: string[]
          validation_status?: string
        }
        Update: {
          batch_job_id?: string | null
          category?: string | null
          correct_option_id?: string
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          import_identity?: string | null
          options?: Json
          partition_keys?: Json
          performance_indicator?: string | null
          published_question_id?: string | null
          quality_score?: number | null
          question_hash?: string | null
          question_text?: string
          question_type?: string
          raw_response?: Json
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_custom_id?: string | null
          tags?: string[]
          updated_at?: string
          validation_errors?: string[]
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_question_candidates_batch_job_id_fkey"
            columns: ["batch_job_id"]
            isOneToOne: false
            referencedRelation: "deca_batch_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_question_candidates_published_question_id_fkey"
            columns: ["published_question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_import_receipts: {
        Row: {
          batch_job_id: string | null
          created_at: string
          error_summary: string | null
          failed_count: number
          id: string
          import_identity: string
          imported_count: number
          queue_id: string
          skipped_count: number
          source_custom_id: string
          status: string
          updated_at: string
        }
        Insert: {
          batch_job_id?: string | null
          created_at?: string
          error_summary?: string | null
          failed_count?: number
          id?: string
          import_identity: string
          imported_count?: number
          queue_id: string
          skipped_count?: number
          source_custom_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          batch_job_id?: string | null
          created_at?: string
          error_summary?: string | null
          failed_count?: number
          id?: string
          import_identity?: string
          imported_count?: number
          queue_id?: string
          skipped_count?: number
          source_custom_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_import_receipts_batch_job_id_fkey"
            columns: ["batch_job_id"]
            isOneToOne: false
            referencedRelation: "deca_batch_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_import_receipts_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "generation_queue_v3"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_queue_v3: {
        Row: {
          all_except_needed: number
          category: string
          created_at: string
          definition_needed: number
          fill_needed: number
          id: string
          indicator_code: string
          last_error: string | null
          locked_at: string | null
          locked_by_batch_id: string | null
          partition_key: string
          partition_keys: Json
          performance_indicator: string | null
          priority: number
          prompt_context: string | null
          scenario_needed: number
          status: string
          updated_at: string
        }
        Insert: {
          all_except_needed?: number
          category: string
          created_at?: string
          definition_needed?: number
          fill_needed?: number
          id?: string
          indicator_code: string
          last_error?: string | null
          locked_at?: string | null
          locked_by_batch_id?: string | null
          partition_key: string
          partition_keys?: Json
          performance_indicator?: string | null
          priority?: number
          prompt_context?: string | null
          scenario_needed?: number
          status?: string
          updated_at?: string
        }
        Update: {
          all_except_needed?: number
          category?: string
          created_at?: string
          definition_needed?: number
          fill_needed?: number
          id?: string
          indicator_code?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by_batch_id?: string | null
          partition_key?: string
          partition_keys?: Json
          performance_indicator?: string | null
          priority?: number
          prompt_context?: string | null
          scenario_needed?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      governance_ballots: {
        Row: {
          created_at: string
          decision: string
          owner_user_id: string
          updated_at: string
          vote_id: string
          withdrawn_at: string | null
        }
        Insert: {
          created_at?: string
          decision: string
          owner_user_id: string
          updated_at?: string
          vote_id: string
          withdrawn_at?: string | null
        }
        Update: {
          created_at?: string
          decision?: string
          owner_user_id?: string
          updated_at?: string
          vote_id?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "governance_ballots_vote_id_fkey"
            columns: ["vote_id"]
            isOneToOne: false
            referencedRelation: "governance_votes"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_votes: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          executed_at: string | null
          expires_at: string | null
          id: string
          metadata: Json
          reason: string | null
          required_approvals: number
          required_rejections: number
          resolved_at: string | null
          status: string
          target_email: string | null
          target_user_id: string | null
          threshold: string
          vote_kind: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          executed_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          required_approvals?: number
          required_rejections?: number
          resolved_at?: string | null
          status?: string
          target_email?: string | null
          target_user_id?: string | null
          threshold: string
          vote_kind?: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          executed_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          required_approvals?: number
          required_rejections?: number
          resolved_at?: string | null
          status?: string
          target_email?: string | null
          target_user_id?: string | null
          threshold?: string
          vote_kind?: string
        }
        Relationships: []
      }
      name_reviews: {
        Row: {
          created_at: string
          id: string
          matched_term: string | null
          replacement_name: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          matched_term?: string | null
          replacement_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          matched_term?: string | null
          replacement_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_broadcasts: {
        Row: {
          audience: string
          created_at: string
          created_by: string | null
          id: string
          message: string
          recipient_count: number
          sent_at: string | null
          status: string
          title: string
        }
        Insert: {
          audience: string
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          recipient_count?: number
          sent_at?: string | null
          status?: string
          title: string
        }
        Update: {
          audience?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          recipient_count?: number
          sent_at?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_tier: string
          created_at: string
          display_name: string | null
          last_owner_activity_at: string
          owner_privileges_restored_at: string | null
          owner_privileges_suspended: boolean
          owner_privileges_suspended_at: string | null
          owner_state: string
          owner_state_updated_at: string
          phone: string | null
          role: string
          suspended_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_tier?: string
          created_at?: string
          display_name?: string | null
          last_owner_activity_at?: string
          owner_privileges_restored_at?: string | null
          owner_privileges_suspended?: boolean
          owner_privileges_suspended_at?: string | null
          owner_state?: string
          owner_state_updated_at?: string
          phone?: string | null
          role?: string
          suspended_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_tier?: string
          created_at?: string
          display_name?: string | null
          last_owner_activity_at?: string
          owner_privileges_restored_at?: string | null
          owner_privileges_suspended?: boolean
          owner_privileges_suspended_at?: string | null
          owner_state?: string
          owner_state_updated_at?: string
          phone?: string | null
          role?: string
          suspended_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      question_lifecycle_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          id: string
          new_state: string
          previous_state: string
          question_id: string
          reason: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          new_state: string
          previous_state: string
          question_id: string
          reason: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          new_state?: string
          previous_state?: string
          question_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_lifecycle_events_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_reports: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          question_id: string | null
          reason: string
          report_snapshot: Json
          reporter_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          test_id: string | null
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          question_id?: string | null
          reason?: string
          report_snapshot?: Json
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          test_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          question_id?: string | null
          reason?: string
          report_snapshot?: Json
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          test_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_reports_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_reports_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "test_ids"
            referencedColumns: ["id"]
          },
        ]
      }
      question_versions: {
        Row: {
          change_reason: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          question_id: string
          snapshot: Json
          version_number: number
        }
        Insert: {
          change_reason: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          question_id: string
          snapshot: Json
          version_number: number
        }
        Update: {
          change_reason?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          question_id?: string
          snapshot?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "question_versions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          correct_option_id: string
          created_at: string
          difficulty: string
          explanation: string | null
          id: string
          lifecycle_state: string
          options: Json
          partition_key: string
          performance_indicator: string | null
          question_hash: string | null
          question_text: string
          question_type: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          correct_option_id: string
          created_at?: string
          difficulty: string
          explanation?: string | null
          id?: string
          lifecycle_state?: string
          options: Json
          partition_key: string
          performance_indicator?: string | null
          question_hash?: string | null
          question_text: string
          question_type?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          correct_option_id?: string
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          lifecycle_state?: string
          options?: Json
          partition_key?: string
          performance_indicator?: string | null
          question_hash?: string | null
          question_text?: string
          question_type?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          event_id: string
          event_type: string
          processed_at: string
          stripe_created_at: string | null
        }
        Insert: {
          event_id: string
          event_type: string
          processed_at?: string
          stripe_created_at?: string | null
        }
        Update: {
          event_id?: string
          event_type?: string
          processed_at?: string
          stripe_created_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          price_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          price_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          price_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_assignment_attempts: {
        Row: {
          attempt_number: number
          attempt_state: Json
          correct: number
          created_at: string
          elapsed_seconds: number | null
          id: string
          percent: number
          question_results: Json
          recipient_id: string
          started_at: string
          submitted_at: string | null
          test_id: string | null
          topic_results: Json
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attempt_number?: number
          attempt_state?: Json
          correct?: number
          created_at?: string
          elapsed_seconds?: number | null
          id?: string
          percent?: number
          question_results?: Json
          recipient_id: string
          started_at?: string
          submitted_at?: string | null
          test_id?: string | null
          topic_results?: Json
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attempt_number?: number
          attempt_state?: Json
          correct?: number
          created_at?: string
          elapsed_seconds?: number | null
          id?: string
          percent?: number
          question_results?: Json
          recipient_id?: string
          started_at?: string
          submitted_at?: string | null
          test_id?: string | null
          topic_results?: Json
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_assignment_attempts_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "team_assignment_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      team_assignment_recipients: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assignment_id: string
          completed_at: string | null
          id: string
          membership_id: string
          status: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_id: string
          completed_at?: string | null
          id?: string
          membership_id: string
          status?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_id?: string
          completed_at?: string | null
          id?: string
          membership_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_assignment_recipients_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "team_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_assignment_recipients_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "team_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      team_assignments: {
        Row: {
          assignment_settings: Json
          assignment_type: string
          attempt_limit: number
          blueprint_snapshot: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          group_id: string | null
          id: string
          status: string
          team_id: string
          test_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignment_settings?: Json
          assignment_type?: string
          attempt_limit?: number
          blueprint_snapshot?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          group_id?: string | null
          id?: string
          status?: string
          team_id: string
          test_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignment_settings?: Json
          assignment_type?: string
          attempt_limit?: number
          blueprint_snapshot?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          group_id?: string | null
          id?: string
          status?: string
          team_id?: string
          test_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "team_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          membership_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          membership_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          membership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "team_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_group_members_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "team_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      team_groups: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_groups_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string | null
          email: string
          email_sent_at: string | null
          expires_at: string
          id: string
          last_send_error: string | null
          role: string
          role_label: string
          send_count: number
          status: string
          team_id: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          email_sent_at?: string | null
          expires_at?: string
          id?: string
          last_send_error?: string | null
          role?: string
          role_label?: string
          send_count?: number
          status?: string
          team_id: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          email_sent_at?: string | null
          expires_at?: string
          id?: string
          last_send_error?: string | null
          role?: string
          role_label?: string
          send_count?: number
          status?: string
          team_id?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          created_at: string
          created_by: string | null
          display_name: string | null
          email: string | null
          id: string
          managed_by: string | null
          role: string
          role_label: string
          status: string
          team_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          managed_by?: string | null
          role?: string
          role_label?: string
          status?: string
          team_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          managed_by?: string | null
          role?: string
          role_label?: string
          status?: string
          team_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          billing_owner_user_id: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          settings: Json
          status: string
          updated_at: string
        }
        Insert: {
          billing_owner_user_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          settings?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          billing_owner_user_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          settings?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      test_ids: {
        Row: {
          blueprint_snapshot: Json | null
          blueprint_version_id: string | null
          category: string
          created_at: string
          created_by: string | null
          difficulties: string[]
          generation_metadata: Json
          id: string
          mode: string
          pool_timestamp: string
          question_count: number
          topic_tags: string[]
        }
        Insert: {
          blueprint_snapshot?: Json | null
          blueprint_version_id?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          difficulties?: string[]
          generation_metadata?: Json
          id: string
          mode?: string
          pool_timestamp: string
          question_count: number
          topic_tags?: string[]
        }
        Update: {
          blueprint_snapshot?: Json | null
          blueprint_version_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          difficulties?: string[]
          generation_metadata?: Json
          id?: string
          mode?: string
          pool_timestamp?: string
          question_count?: number
          topic_tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "test_ids_blueprint_version_id_fkey"
            columns: ["blueprint_version_id"]
            isOneToOne: false
            referencedRelation: "blueprint_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_active_sessions: {
        Row: {
          current_index: number
          mode: string | null
          question_count: number
          saved_at: string
          session_state: Json
          session_type: string
          test_id: string | null
          timer_seconds_remaining: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          current_index?: number
          mode?: string | null
          question_count?: number
          saved_at?: string
          session_state?: Json
          session_type?: string
          test_id?: string | null
          timer_seconds_remaining?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          current_index?: number
          mode?: string | null
          question_count?: number
          saved_at?: string
          session_state?: Json
          session_type?: string
          test_id?: string | null
          timer_seconds_remaining?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          delivery_status: string
          id: string
          message: string
          metadata: Json
          read_at: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_status?: string
          id?: string
          message: string
          metadata?: Json
          read_at?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_status?: string
          id?: string
          message?: string
          metadata?: Json
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          account_tier: string
          notification_settings: Json
          selected_settings: Json
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_tier?: string
          notification_settings?: Json
          selected_settings?: Json
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_tier?: string
          notification_settings?: Json
          selected_settings?: Json
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_question_status: {
        Row: {
          last_seen_at: string | null
          question_id: string
          seen_count: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string | null
          question_id: string
          seen_count?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_seen_at?: string | null
          question_id?: string
          seen_count?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_question_status_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_test_history: {
        Row: {
          blueprint: string | null
          category: string | null
          completed_at: string
          correct: number
          difficulty: string | null
          id: string
          metadata: Json
          mode: string
          percent: number
          question_count: number
          test_id: string
          topics: string[]
          total: number
          user_id: string
        }
        Insert: {
          blueprint?: string | null
          category?: string | null
          completed_at?: string
          correct?: number
          difficulty?: string | null
          id?: string
          metadata?: Json
          mode: string
          percent?: number
          question_count?: number
          test_id: string
          topics?: string[]
          total?: number
          user_id: string
        }
        Update: {
          blueprint?: string | null
          category?: string | null
          completed_at?: string
          correct?: number
          difficulty?: string | null
          id?: string
          metadata?: Json
          mode?: string
          percent?: number
          question_count?: number
          test_id?: string
          topics?: string[]
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      user_topic_stats: {
        Row: {
          correct: number
          label: string
          stat_type: string
          total: number
          unsure: number
          updated_at: string
          user_id: string
        }
        Insert: {
          correct?: number
          label: string
          stat_type: string
          total?: number
          unsure?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          correct?: number
          label?: string
          stat_type?: string
          total?: number
          unsure?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_team_invite: {
        Args: { p_token_hash: string }
        Returns: {
          membership_id: string
          role: string
          role_label: string
          team_id: string
        }[]
      }
      bootstrap_initial_owner: {
        Args: { p_reason: string; p_target_user_id: string }
        Returns: undefined
      }
      build_deca_batch_jsonl: {
        Args: { limit_count?: number }
        Returns: {
          batch_job_id: string
          jsonl: string
          row_count: number
        }[]
      }
      can_admin_team: { Args: { p_team_id: string }; Returns: boolean }
      can_manage_team: { Args: { p_team_id: string }; Returns: boolean }
      cast_owner_removal_vote: {
        Args: { p_decision?: string; p_vote_id: string }
        Returns: string
      }
      current_team_role: { Args: { p_team_id: string }; Returns: string }
      current_user_role: { Args: never; Returns: string }
      escape_repository_like: { Args: { p_value: string }; Returns: string }
      expire_owner_removal_votes: { Args: never; Returns: number }
      get_active_owner_count: { Args: never; Returns: number }
      get_owner_removal_required_approvals: {
        Args: { p_target_user_id: string }
        Returns: number
      }
      initiate_owner_removal_vote: {
        Args: {
          p_expires_at?: string
          p_reason: string
          p_target_user_id: string
        }
        Returns: string
      }
      insert_generated_questions: {
        Args: {
          p_import_identity?: string
          p_queue_id: string
          p_questions: Json
        }
        Returns: {
          failed_count: number
          imported_count: number
          skipped_count: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_eligible_owner: { Args: { p_user_id: string }; Returns: boolean }
      is_owner: { Args: never; Returns: boolean }
      is_question_eligible_for_test_generation: {
        Args: { p_question_id: string }
        Returns: boolean
      }
      mark_inactive_owners: { Args: { p_before?: string }; Returns: number }
      normalize_generated_difficulty: {
        Args: { p_value: string }
        Returns: string
      }
      normalize_generated_question_type: {
        Args: { p_value: string }
        Returns: string
      }
      publish_generated_question: {
        Args: { p_candidate_id: string }
        Returns: string
      }
      recalculate_generation_queue_needed: {
        Args: { p_target_per_type?: number }
        Returns: number
      }
      search_generation_pipeline: {
        Args: {
          p_batch_job_id?: string
          p_category?: string
          p_cursor_updated_at?: string
          p_cursor_id?: string
          p_has_errors?: boolean
          p_page_size?: number
          p_search?: string
          p_status?: string
        }
        Returns: {
          all_except_needed: number
          batch_error: string | null
          batch_status: string | null
          category: string
          definition_needed: number
          failed_count: number | null
          fill_needed: number
          has_next_page: boolean
          import_offset: number | null
          imported_count: number | null
          indicator_code: string
          input_file_id: string | null
          locked_by_batch_id: string | null
          openai_batch_id: string | null
          output_file_id: string | null
          partition_key: string
          partition_keys: Json
          performance_indicator: string | null
          priority: number
          queue_created_at: string
          queue_id: string
          queue_last_error: string | null
          queue_status: string
          queue_updated_at: string
          row_count: number | null
          scenario_needed: number
        }[]
      }
      search_question_repository: {
        Args: {
          p_created_from?: string
          p_created_to?: string
          p_cursor_id?: string
          p_cursor_updated_at?: string
          p_difficulties?: string[]
          p_lifecycle_state?: string
          p_page_size?: number
          p_partition_keys?: string[]
          p_performance_indicators?: string[]
          p_question_types?: string[]
          p_search?: string
          p_tags?: string[]
        }
        Returns: {
          created_at: string
          difficulty: string
          has_next_page: boolean
          lifecycle_state: string
          partition_key: string
          performance_indicator: string
          question_hash: string
          question_id: string
          question_text: string
          question_type: string
          tags: string[]
          updated_at: string
        }[]
      }
      set_own_owner_privileges_suspended: {
        Args: { suspend_value: boolean }
        Returns: string
      }
      set_question_lifecycle_state: {
        Args: { p_new_state: string; p_question_id: string; p_reason: string }
        Returns: {
          lifecycle_state: string
          question_id: string
          updated_at: string
        }[]
      }
      set_user_platform_role: {
        Args: {
          p_governance_vote_id?: string
          p_new_role: string
          p_reason: string
          p_target_user_id: string
        }
        Returns: undefined
      }
      withdraw_owner_removal_vote: {
        Args: { p_vote_id: string }
        Returns: undefined
      }
      write_admin_audit: {
        Args: {
          action_name: string
          metadata_value?: Json
          reason_value?: string
          resource_id_value?: string
          resource_type_name: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
