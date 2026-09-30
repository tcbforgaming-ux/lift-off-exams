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
          actor_role: string | null
          actor_user_id: string | null
          correlation_id: string | null
          created_at: string
          id: string
          metadata: Json
          new_values: Json | null
          previous_values: Json | null
          reason: string | null
          report_id: string | null
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_role?: string | null
          actor_user_id?: string | null
          correlation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          new_values?: Json | null
          previous_values?: Json | null
          reason?: string | null
          report_id?: string | null
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_role?: string | null
          actor_user_id?: string | null
          correlation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          new_values?: Json | null
          previous_values?: Json | null
          reason?: string | null
          report_id?: string | null
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "question_reports"
            referencedColumns: ["id"]
          },
        ]
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
      legacy_test_id_resolutions: {
        Row: {
          created_at: string
          legacy_test_id: string
          reason: string
          replacement_test_id: string | null
          resolution_status: string
          resolved_at: string
          resolved_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          legacy_test_id: string
          reason: string
          replacement_test_id?: string | null
          resolution_status: string
          resolved_at?: string
          resolved_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          legacy_test_id?: string
          reason?: string
          replacement_test_id?: string | null
          resolution_status?: string
          resolved_at?: string
          resolved_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legacy_test_id_resolutions_legacy_test_id_fkey"
            columns: ["legacy_test_id"]
            isOneToOne: true
            referencedRelation: "test_ids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legacy_test_id_resolutions_replacement_test_id_fkey"
            columns: ["replacement_test_id"]
            isOneToOne: false
            referencedRelation: "test_ids"
            referencedColumns: ["id"]
          },
        ]
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
          category: string
          correction_version_id: string | null
          created_at: string
          description: string
          duplicate_of: string | null
          encountered_snapshot: Json
          entity_type: string
          id: string
          idempotency_key: string | null
          lifecycle_event_id: string | null
          question_id: string | null
          reason: string
          report_snapshot: Json
          reporter_id: string | null
          resolution_category: string | null
          resolution_idempotency_key: string | null
          resolution_message: string | null
          resolved_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          session_id: string | null
          status: string
          test_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          admin_note?: string | null
          category?: string
          correction_version_id?: string | null
          created_at?: string
          description: string
          duplicate_of?: string | null
          encountered_snapshot?: Json
          entity_type?: string
          id?: string
          idempotency_key?: string | null
          lifecycle_event_id?: string | null
          question_id?: string | null
          reason?: string
          report_snapshot?: Json
          reporter_id?: string | null
          resolution_category?: string | null
          resolution_idempotency_key?: string | null
          resolution_message?: string | null
          resolved_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          status?: string
          test_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          admin_note?: string | null
          category?: string
          correction_version_id?: string | null
          created_at?: string
          description?: string
          duplicate_of?: string | null
          encountered_snapshot?: Json
          entity_type?: string
          id?: string
          idempotency_key?: string | null
          lifecycle_event_id?: string | null
          question_id?: string | null
          reason?: string
          report_snapshot?: Json
          reporter_id?: string | null
          resolution_category?: string | null
          resolution_idempotency_key?: string | null
          resolution_message?: string | null
          resolved_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          status?: string
          test_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "question_reports_correction_version_id_fkey"
            columns: ["correction_version_id"]
            isOneToOne: false
            referencedRelation: "question_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_reports_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "question_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_reports_lifecycle_event_id_fkey"
            columns: ["lifecycle_event_id"]
            isOneToOne: false
            referencedRelation: "question_lifecycle_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_reports_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
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
          previous_snapshot: Json | null
          question_id: string
          report_id: string | null
          snapshot: Json
          version_number: number
        }
        Insert: {
          change_reason: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          previous_snapshot?: Json | null
          question_id: string
          report_id?: string | null
          snapshot: Json
          version_number: number
        }
        Update: {
          change_reason?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          previous_snapshot?: Json | null
          question_id?: string
          report_id?: string | null
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
          {
            foreignKeyName: "question_versions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "question_reports"
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
      test_definition_questions: {
        Row: {
          content_hash: string
          created_at: string
          position: number
          question_id: string
          question_updated_at: string
          stratum_id: string
          test_definition_id: string
        }
        Insert: {
          content_hash: string
          created_at?: string
          position: number
          question_id: string
          question_updated_at: string
          stratum_id: string
          test_definition_id: string
        }
        Update: {
          content_hash?: string
          created_at?: string
          position?: number
          question_id?: string
          question_updated_at?: string
          stratum_id?: string
          test_definition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_definition_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_definition_questions_test_definition_id_fkey"
            columns: ["test_definition_id"]
            isOneToOne: false
            referencedRelation: "test_ids"
            referencedColumns: ["definition_id"]
          },
        ]
      }
      test_ids: {
        Row: {
          algorithm_version: string | null
          blueprint_snapshot: Json | null
          blueprint_version_id: string | null
          canonical_seed: string | null
          category: string
          completed_at: string | null
          content_policy: string
          created_at: string
          created_by: string | null
          definition_id: string
          difficulties: string[]
          eligibility_rule_version: string | null
          eligibility_snapshot: Json
          failure_metadata: Json
          generation_metadata: Json
          generation_status: string | null
          id: string
          idempotency_key: string | null
          mode: string
          pool_timestamp: string
          question_count: number
          request_hash: string | null
          resolved_distribution: Json
          retired_at: string | null
          selected_question_count: number
          topic_tags: string[]
        }
        Insert: {
          algorithm_version?: string | null
          blueprint_snapshot?: Json | null
          blueprint_version_id?: string | null
          canonical_seed?: string | null
          category: string
          completed_at?: string | null
          content_policy?: string
          created_at?: string
          created_by?: string | null
          definition_id?: string
          difficulties?: string[]
          eligibility_rule_version?: string | null
          eligibility_snapshot?: Json
          failure_metadata?: Json
          generation_metadata?: Json
          generation_status?: string | null
          id: string
          idempotency_key?: string | null
          mode?: string
          pool_timestamp: string
          question_count: number
          request_hash?: string | null
          resolved_distribution?: Json
          retired_at?: string | null
          selected_question_count?: number
          topic_tags?: string[]
        }
        Update: {
          algorithm_version?: string | null
          blueprint_snapshot?: Json | null
          blueprint_version_id?: string | null
          canonical_seed?: string | null
          category?: string
          completed_at?: string | null
          content_policy?: string
          created_at?: string
          created_by?: string | null
          definition_id?: string
          difficulties?: string[]
          eligibility_rule_version?: string | null
          eligibility_snapshot?: Json
          failure_metadata?: Json
          generation_metadata?: Json
          generation_status?: string | null
          id?: string
          idempotency_key?: string | null
          mode?: string
          pool_timestamp?: string
          question_count?: number
          request_hash?: string | null
          resolved_distribution?: Json
          retired_at?: string | null
          selected_question_count?: number
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
      test_result_items: {
        Row: {
          content_hash_at_submission: string | null
          correct_option_id: string
          created_at: string
          difficulty: string
          explanation_snapshot: string | null
          is_correct: boolean
          options: Json
          position: number
          question_id: string
          question_text: string
          question_type: string
          selected_option_id: string | null
          session_id: string
          tags: string[]
        }
        Insert: {
          content_hash_at_submission?: string | null
          correct_option_id: string
          created_at?: string
          difficulty: string
          explanation_snapshot?: string | null
          is_correct: boolean
          options: Json
          position: number
          question_id: string
          question_text: string
          question_type: string
          selected_option_id?: string | null
          session_id: string
          tags?: string[]
        }
        Update: {
          content_hash_at_submission?: string | null
          correct_option_id?: string
          created_at?: string
          difficulty?: string
          explanation_snapshot?: string | null
          is_correct?: boolean
          options?: Json
          position?: number
          question_id?: string
          question_text?: string
          question_type?: string
          selected_option_id?: string | null
          session_id?: string
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "test_result_items_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_result_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "test_results"
            referencedColumns: ["session_id"]
          },
        ]
      }
      test_results: {
        Row: {
          active_duration_seconds: number
          answered_questions: number
          blueprint_version: string | null
          correct_answers: number
          created_at: string
          explanation_policy_version: string
          incorrect_answers: number
          percentage: number
          raw_score: number
          scoring_rule_version: string
          session_id: string
          submitted_at: string
          test_definition_id: string
          total_questions: number
          unanswered_questions: number
          user_id: string
        }
        Insert: {
          active_duration_seconds: number
          answered_questions: number
          blueprint_version?: string | null
          correct_answers: number
          created_at?: string
          explanation_policy_version: string
          incorrect_answers: number
          percentage: number
          raw_score: number
          scoring_rule_version: string
          session_id: string
          submitted_at: string
          test_definition_id: string
          total_questions: number
          unanswered_questions: number
          user_id: string
        }
        Update: {
          active_duration_seconds?: number
          answered_questions?: number
          blueprint_version?: string | null
          correct_answers?: number
          created_at?: string
          explanation_policy_version?: string
          incorrect_answers?: number
          percentage?: number
          raw_score?: number
          scoring_rule_version?: string
          session_id?: string
          submitted_at?: string
          test_definition_id?: string
          total_questions?: number
          unanswered_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_results_session_id_user_id_test_definition_id_fkey"
            columns: ["session_id", "user_id", "test_definition_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id", "user_id", "test_definition_id"]
          },
        ]
      }
      test_session_answers: {
        Row: {
          answer_version: number
          created_at: string
          question_id: string
          selected_option_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          answer_version?: number
          created_at?: string
          question_id: string
          selected_option_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          answer_version?: number
          created_at?: string
          question_id?: string
          selected_option_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_session_answers_session_id_question_id_fkey"
            columns: ["session_id", "question_id"]
            isOneToOne: true
            referencedRelation: "test_session_questions"
            referencedColumns: ["session_id", "question_id"]
          },
        ]
      }
      test_session_questions: {
        Row: {
          content_hash_at_start: string
          correct_option_id_at_start: string
          created_at: string
          difficulty: string
          explanation_at_start: string | null
          options: Json
          position: number
          question_id: string
          question_text: string
          question_type: string
          question_updated_at_at_start: string
          session_id: string
          tags: string[]
        }
        Insert: {
          content_hash_at_start: string
          correct_option_id_at_start: string
          created_at?: string
          difficulty: string
          explanation_at_start?: string | null
          options: Json
          position: number
          question_id: string
          question_text: string
          question_type: string
          question_updated_at_at_start: string
          session_id: string
          tags?: string[]
        }
        Update: {
          content_hash_at_start?: string
          correct_option_id_at_start?: string
          created_at?: string
          difficulty?: string
          explanation_at_start?: string | null
          options?: Json
          position?: number
          question_id?: string
          question_text?: string
          question_type?: string
          question_updated_at_at_start?: string
          session_id?: string
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "test_session_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_session_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_sessions: {
        Row: {
          accumulated_active_seconds: number
          active_period_started_at: string | null
          created_at: string
          current_position: number
          explanation_policy_version: string
          id: string
          idempotency_key: string
          last_activity_at: string
          mode: string
          paused_at: string | null
          question_count: number
          resumed_at: string | null
          scoring_rule_version: string
          started_at: string
          status: string
          submitted_at: string | null
          test_definition_id: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          accumulated_active_seconds?: number
          active_period_started_at?: string | null
          created_at?: string
          current_position?: number
          explanation_policy_version?: string
          id?: string
          idempotency_key: string
          last_activity_at?: string
          mode: string
          paused_at?: string | null
          question_count: number
          resumed_at?: string | null
          scoring_rule_version?: string
          started_at?: string
          status?: string
          submitted_at?: string | null
          test_definition_id: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          accumulated_active_seconds?: number
          active_period_started_at?: string | null
          created_at?: string
          current_position?: number
          explanation_policy_version?: string
          id?: string
          idempotency_key?: string
          last_activity_at?: string
          mode?: string
          paused_at?: string | null
          question_count?: number
          resumed_at?: string | null
          scoring_rule_version?: string
          started_at?: string
          status?: string
          submitted_at?: string | null
          test_definition_id?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_sessions_test_definition_id_fkey"
            columns: ["test_definition_id"]
            isOneToOne: false
            referencedRelation: "test_ids"
            referencedColumns: ["definition_id"]
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
      backfill_legacy_test_membership: {
        Args: {
          p_legacy_test_id: string
          p_ordered_question_ids: string[]
          p_reason: string
        }
        Returns: number
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
      canonicalize_test_blueprint: {
        Args: { p_blueprint_id: string; p_expected_version?: string }
        Returns: Json
      }
      cast_owner_removal_vote: {
        Args: { p_decision?: string; p_vote_id: string }
        Returns: string
      }
      correct_reported_question: {
        Args: {
          p_correct_option_id: string
          p_difficulty: string
          p_expected_question_updated_at: string
          p_expected_report_version: number
          p_explanation: string
          p_idempotency_key: string
          p_options: Json
          p_partition_key: string
          p_performance_indicator: string
          p_question_text: string
          p_question_type: string
          p_reason: string
          p_report_id: string
          p_resolution_message: string
          p_tags: string[]
        }
        Returns: {
          correction_version_id: string
          question_id: string
          question_updated_at: string
          report_id: string
          report_status: string
          report_version: number
        }[]
      }
      current_team_role: { Args: { p_team_id: string }; Returns: string }
      current_user_role: { Args: never; Returns: string }
      escape_repository_like: { Args: { p_value: string }; Returns: string }
      expire_owner_removal_votes: { Args: never; Returns: number }
      generate_test_from_blueprint: {
        Args: {
          p_blueprint_id: string
          p_expected_blueprint_version: string
          p_idempotency_key?: string
          p_requested_count: number
          p_seed?: string
        }
        Returns: {
          algorithm_version: string
          blueprint_summary: Json
          canonical_seed: string
          generation_status: string
          requested_count: number
          selected_count: number
          shortage: Json
          success: boolean
          test_definition_id: string
          test_id: string
        }[]
      }
      generate_test_share_code: { Args: never; Returns: string }
      generated_difficulty_label: { Args: { p_value: string }; Returns: string }
      generated_question_type_label: {
        Args: { p_value: string }
        Returns: string
      }
      get_active_owner_count: { Args: never; Returns: number }
      get_generated_test_manifest: {
        Args: { p_test_id: string }
        Returns: {
          difficulty: string
          options: Json
          performance_indicator: string
          question_id: string
          question_position: number
          question_text: string
          question_type: string
          tags: string[]
          test_definition_id: string
          test_id: string
          updated_since_generation: boolean
        }[]
      }
      get_own_question_reports: {
        Args: {
          p_cursor_created_at?: string
          p_cursor_id?: string
          p_page_size?: number
        }
        Returns: {
          category: string
          created_at: string
          has_next_page: boolean
          question_id: string
          report_id: string
          report_status: string
          resolution_category: string
          resolution_message: string
          test_id: string
          updated_at: string
        }[]
      }
      get_owner_removal_required_approvals: {
        Args: { p_target_user_id: string }
        Returns: number
      }
      get_question_report_detail: {
        Args: { p_report_id: string }
        Returns: {
          category: string
          correct_option_id: string
          correction_version_id: string
          created_at: string
          description: string
          difficulty: string
          duplicate_of: string
          encountered_snapshot: Json
          explanation: string
          lifecycle_event_id: string
          lifecycle_state: string
          options: Json
          partition_key: string
          performance_indicator: string
          question_id: string
          question_text: string
          question_type: string
          question_updated_at: string
          report_id: string
          report_status: string
          report_version: number
          reporter_email: string
          resolution_category: string
          resolution_message: string
          tags: string[]
          test_id: string
          updated_at: string
        }[]
      }
      get_test_history: {
        Args: {
          p_cursor_activity_at?: string
          p_cursor_session_id?: string
          p_page_size?: number
          p_status?: string
        }
        Returns: {
          answered_questions: number
          category: string
          has_next_page: boolean
          last_activity_at: string
          mode: string
          percentage: number
          question_count: number
          session_id: string
          session_status: string
          started_at: string
          submitted_at: string
          test_id: string
          topic_tags: string[]
        }[]
      }
      get_test_id_preview: {
        Args: { p_test_id: string }
        Returns: {
          authentication_required_to_launch: boolean
          blueprint_name: string
          blueprint_version: string
          category: string
          content_policy: string
          creation_date: string
          difficulties: string[]
          generation_status: string
          launch_available: boolean
          legacy_resolution_status: string
          original_question_count: number
          replacement_test_id: string
          test_id: string
          topic_tags: string[]
          updated_question_count: number
        }[]
      }
      get_test_question_explanation: {
        Args: { p_question_id: string; p_test_id: string }
        Returns: {
          explanation: string
          question_id: string
        }[]
      }
      get_test_result: {
        Args: { p_session_id: string }
        Returns: {
          active_duration_seconds: number
          answered_questions: number
          can_view_explanations: boolean
          correct_answers: number
          correct_option_id: string
          difficulty: string
          incorrect_answers: number
          is_correct: boolean
          options: Json
          percentage: number
          question_id: string
          question_position: number
          question_text: string
          question_type: string
          selected_option_id: string
          session_id: string
          submitted_at: string
          tags: string[]
          test_id: string
          total_questions: number
          unanswered_questions: number
        }[]
      }
      get_test_result_explanations: {
        Args: { p_session_id: string }
        Returns: {
          explanation: string
          question_id: string
        }[]
      }
      get_test_session: {
        Args: { p_session_id: string }
        Returns: {
          active_duration_seconds: number
          answer_version: number
          answered_questions: number
          current_position: number
          difficulty: string
          last_activity_at: string
          options: Json
          question_id: string
          question_position: number
          question_text: string
          question_type: string
          selected_option_id: string
          session_id: string
          session_status: string
          session_version: number
          started_at: string
          tags: string[]
          test_id: string
          total_questions: number
        }[]
      }
      has_premium_explanation_access: {
        Args: { p_user_id?: string }
        Returns: boolean
      }
      initiate_owner_removal_vote: {
        Args: {
          p_expires_at?: string
          p_reason: string
          p_target_user_id: string
        }
        Returns: string
      }
      insert_generated_questions:
        | {
            Args: { p_indicator: string; p_questions: Json }
            Returns: undefined
          }
        | {
            Args: {
              p_import_identity?: string
              p_questions: Json
              p_queue_id: string
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
      normalize_test_difficulties: {
        Args: { p_values: string[] }
        Returns: string[]
      }
      normalize_test_question_types: {
        Args: { p_values: string[] }
        Returns: string[]
      }
      normalize_test_seed: { Args: { p_seed: string }; Returns: string }
      pause_test_session: {
        Args: { p_expected_session_version: number; p_session_id: string }
        Returns: number
      }
      publish_generated_question: {
        Args: { p_candidate_id: string }
        Returns: string
      }
      recalculate_generation_queue_needed: {
        Args: { p_target_per_type?: number }
        Returns: number
      }
      resolve_legacy_test_id: {
        Args: {
          p_legacy_test_id: string
          p_reason?: string
          p_replacement_test_id?: string
          p_resolution_status: string
        }
        Returns: undefined
      }
      resolve_report_with_question_lifecycle: {
        Args: {
          p_expected_question_updated_at: string
          p_expected_report_version: number
          p_idempotency_key: string
          p_new_lifecycle_state: string
          p_reason: string
          p_report_id: string
          p_resolution_message: string
        }
        Returns: {
          lifecycle_event_id: string
          lifecycle_state: string
          question_id: string
          question_updated_at: string
          report_id: string
          report_status: string
          report_version: number
        }[]
      }
      resume_test_session: {
        Args: { p_expected_session_version: number; p_session_id: string }
        Returns: number
      }
      save_test_session_answer: {
        Args: {
          p_expected_session_version: number
          p_question_id: string
          p_selected_option_id: string
          p_session_id: string
        }
        Returns: {
          answer_version: number
          answered_questions: number
          session_version: number
          total_questions: number
        }[]
      }
      search_admin_audit_logs: {
        Args: {
          p_action?: string
          p_actor_user_id?: string
          p_created_from?: string
          p_created_to?: string
          p_cursor_created_at?: string
          p_cursor_id?: string
          p_page_size?: number
          p_report_id?: string
          p_resource_id?: string
          p_resource_type?: string
        }
        Returns: {
          action: string
          actor_email: string
          actor_role: string
          actor_user_id: string
          audit_id: string
          created_at: string
          has_next_page: boolean
          metadata: Json
          new_values: Json
          previous_values: Json
          reason: string
          report_id: string
          resource_id: string
          resource_type: string
        }[]
      }
      search_generation_pipeline: {
        Args: {
          p_batch_job_id?: string
          p_category?: string
          p_cursor_id?: string
          p_cursor_updated_at?: string
          p_has_errors?: boolean
          p_page_size?: number
          p_search?: string
          p_status?: string
        }
        Returns: {
          all_except_needed: number
          batch_error: string
          batch_status: string
          category: string
          definition_needed: number
          failed_count: number
          fill_needed: number
          has_next_page: boolean
          import_offset: number
          imported_count: number
          indicator_code: string
          input_file_id: string
          locked_by_batch_id: string
          openai_batch_id: string
          output_file_id: string
          partition_key: string
          partition_keys: Json
          performance_indicator: string
          priority: number
          queue_created_at: string
          queue_id: string
          queue_last_error: string
          queue_status: string
          queue_updated_at: string
          row_count: number
          scenario_needed: number
        }[]
      }
      search_question_report_queue: {
        Args: {
          p_category?: string
          p_created_from?: string
          p_created_to?: string
          p_cursor_id?: string
          p_cursor_updated_at?: string
          p_difficulty?: string
          p_lifecycle_state?: string
          p_page_size?: number
          p_performance_indicator?: string
          p_question_type?: string
          p_status?: string
        }
        Returns: {
          category: string
          created_at: string
          difficulty: string
          has_next_page: boolean
          lifecycle_state: string
          performance_indicator: string
          question_id: string
          question_type: string
          report_id: string
          report_status: string
          report_version: number
          reporter_email: string
          test_id: string
          updated_at: string
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
      set_test_session_position: {
        Args: {
          p_expected_session_version: number
          p_position: number
          p_session_id: string
        }
        Returns: number
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
      start_test_session: {
        Args: { p_idempotency_key: string; p_test_id: string }
        Returns: {
          current_position: number
          question_count: number
          session_id: string
          session_version: number
          started_at: string
          status: string
          test_id: string
        }[]
      }
      submit_question_report: {
        Args: {
          p_category: string
          p_description: string
          p_idempotency_key: string
          p_question_id: string
          p_session_id: string
        }
        Returns: {
          created_at: string
          report_id: string
          report_status: string
        }[]
      }
      submit_test_session: {
        Args: { p_expected_session_version: number; p_session_id: string }
        Returns: {
          active_duration_seconds: number
          answered_questions: number
          can_view_explanations: boolean
          correct_answers: number
          incorrect_answers: number
          percentage: number
          session_id: string
          submitted_at: string
          test_id: string
          total_questions: number
          unanswered_questions: number
        }[]
      }
      test_blueprint_text_array: {
        Args: { p_field_name: string; p_value: Json }
        Returns: string[]
      }
      transition_question_report: {
        Args: {
          p_duplicate_of: string
          p_expected_version: number
          p_idempotency_key: string
          p_new_status: string
          p_reason: string
          p_report_id: string
          p_resolution_category: string
          p_resolution_message: string
        }
        Returns: {
          report_id: string
          report_status: string
          report_version: number
          updated_at: string
        }[]
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
      write_test_session_audit: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_new_state: string
          p_previous_state: string
          p_session_id: string
          p_test_id: string
        }
        Returns: undefined
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
