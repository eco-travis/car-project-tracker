
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "attachments": {
                  Row: {
                    "caption": string | null,"created_at": string,"expense_id": string | null,"highlight": boolean,"id": string,"inspiration_id": string | null,"job_id": string | null,"kind": Database["public"]['Enums']["attachment_kind"],"mime_type": string,"owner_id": string,"part_id": string | null,"phase_id": string | null,"size_bytes": number,"storage_path": string,"tag": Database["public"]['Enums']["attachment_tag"] | null,"taken_at": string,"task_id": string | null,"thumb_path": string | null,"tool_id": string | null,"updated_at": string,"vehicle_id": string,"watch_checkin_id": string | null,"watch_item_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "caption"?: string | null,"created_at"?: string,"expense_id"?: string | null,"highlight"?: boolean,"id"?: string,"inspiration_id"?: string | null,"job_id"?: string | null,"kind": Database["public"]['Enums']["attachment_kind"],"mime_type": string,"owner_id"?: string,"part_id"?: string | null,"phase_id"?: string | null,"size_bytes": number,"storage_path": string,"tag"?: Database["public"]['Enums']["attachment_tag"] | null,"taken_at": string,"task_id"?: string | null,"thumb_path"?: string | null,"tool_id"?: string | null,"updated_at"?: string,"vehicle_id": string,"watch_checkin_id"?: string | null,"watch_item_id"?: string | null
                  }
                  Update: {
                    "caption"?: string | null,"created_at"?: string,"expense_id"?: string | null,"highlight"?: boolean,"id"?: string,"inspiration_id"?: string | null,"job_id"?: string | null,"kind"?: Database["public"]['Enums']["attachment_kind"],"mime_type"?: string,"owner_id"?: string,"part_id"?: string | null,"phase_id"?: string | null,"size_bytes"?: number,"storage_path"?: string,"tag"?: Database["public"]['Enums']["attachment_tag"] | null,"taken_at"?: string,"task_id"?: string | null,"thumb_path"?: string | null,"tool_id"?: string | null,"updated_at"?: string,"vehicle_id"?: string,"watch_checkin_id"?: string | null,"watch_item_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "attachments_expense_id_fkey"
      columns: ["expense_id"]
isOneToOne: false
      referencedRelation: "expenses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attachments_inspiration_id_fkey"
      columns: ["inspiration_id"]
isOneToOne: false
      referencedRelation: "inspirations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attachments_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attachments_part_id_fkey"
      columns: ["part_id"]
isOneToOne: false
      referencedRelation: "parts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attachments_phase_id_fkey"
      columns: ["phase_id"]
isOneToOne: false
      referencedRelation: "phases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attachments_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attachments_tool_id_fkey"
      columns: ["tool_id"]
isOneToOne: false
      referencedRelation: "tools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attachments_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attachments_watch_checkin_id_fkey"
      columns: ["watch_checkin_id"]
isOneToOne: false
      referencedRelation: "watch_checkins"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attachments_watch_item_id_fkey"
      columns: ["watch_item_id"]
isOneToOne: false
      referencedRelation: "watch_items"
      referencedColumns: ["id"]
    }
                  ]
                },"expenses": {
                  Row: {
                    "amount_cents": number,"category": Database["public"]['Enums']["expense_category"],"created_at": string,"id": string,"job_id": string | null,"notes": string | null,"owner_id": string,"part_id": string | null,"phase_id": string | null,"spent_on": string,"state": Database["public"]['Enums']["expense_state"],"tool_id": string | null,"updated_at": string,"vehicle_id": string,"vendor": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"category": Database["public"]['Enums']["expense_category"],"created_at"?: string,"id"?: string,"job_id"?: string | null,"notes"?: string | null,"owner_id"?: string,"part_id"?: string | null,"phase_id"?: string | null,"spent_on": string,"state"?: Database["public"]['Enums']["expense_state"],"tool_id"?: string | null,"updated_at"?: string,"vehicle_id": string,"vendor"?: string | null
                  }
                  Update: {
                    "amount_cents"?: number,"category"?: Database["public"]['Enums']["expense_category"],"created_at"?: string,"id"?: string,"job_id"?: string | null,"notes"?: string | null,"owner_id"?: string,"part_id"?: string | null,"phase_id"?: string | null,"spent_on"?: string,"state"?: Database["public"]['Enums']["expense_state"],"tool_id"?: string | null,"updated_at"?: string,"vehicle_id"?: string,"vendor"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "expenses_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_part_id_fkey"
      columns: ["part_id"]
isOneToOne: false
      referencedRelation: "parts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_phase_id_fkey"
      columns: ["phase_id"]
isOneToOne: false
      referencedRelation: "phases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_tool_id_fkey"
      columns: ["tool_id"]
isOneToOne: false
      referencedRelation: "tools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"inspirations": {
                  Row: {
                    "created_at": string,"id": string,"notes": string | null,"owner_id": string,"promoted_job_id": string | null,"promoted_part_id": string | null,"source_url": string | null,"tags": (string)[],"title": string,"updated_at": string,"vehicle_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"notes"?: string | null,"owner_id"?: string,"promoted_job_id"?: string | null,"promoted_part_id"?: string | null,"source_url"?: string | null,"tags"?: (string)[],"title": string,"updated_at"?: string,"vehicle_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"notes"?: string | null,"owner_id"?: string,"promoted_job_id"?: string | null,"promoted_part_id"?: string | null,"source_url"?: string | null,"tags"?: (string)[],"title"?: string,"updated_at"?: string,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inspirations_promoted_job_id_fkey"
      columns: ["promoted_job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inspirations_promoted_part_id_fkey"
      columns: ["promoted_part_id"]
isOneToOne: false
      referencedRelation: "parts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inspirations_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"job_dependencies": {
                  Row: {
                    "blocked_by_job_id": string,"created_at": string,"job_id": string,"owner_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_by_job_id": string,"created_at"?: string,"job_id": string,"owner_id"?: string,"updated_at"?: string
                  }
                  Update: {
                    "blocked_by_job_id"?: string,"created_at"?: string,"job_id"?: string,"owner_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_dependencies_blocked_by_job_id_fkey"
      columns: ["blocked_by_job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_dependencies_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"job_tools": {
                  Row: {
                    "created_at": string,"job_id": string,"owner_id": string,"tool_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"job_id": string,"owner_id"?: string,"tool_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"job_id"?: string,"owner_id"?: string,"tool_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_tools_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_tools_tool_id_fkey"
      columns: ["tool_id"]
isOneToOne: false
      referencedRelation: "tools"
      referencedColumns: ["id"]
    }
                  ]
                },"jobs": {
                  Row: {
                    "budget_cents": number | null,"completed_odometer": number | null,"completed_on": string | null,"created_at": string,"description": string | null,"diy_hours": number | null,"id": string,"links": (string)[],"notes": string | null,"owner_id": string,"performed_by": Database["public"]['Enums']["performed_by"] | null,"performer_name": string | null,"phase_id": string | null,"sort_order": number,"status": Database["public"]['Enums']["job_status"],"title": string,"type": Database["public"]['Enums']["job_type"],"updated_at": string,"vehicle_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "budget_cents"?: number | null,"completed_odometer"?: number | null,"completed_on"?: string | null,"created_at"?: string,"description"?: string | null,"diy_hours"?: number | null,"id"?: string,"links"?: (string)[],"notes"?: string | null,"owner_id"?: string,"performed_by"?: Database["public"]['Enums']["performed_by"] | null,"performer_name"?: string | null,"phase_id"?: string | null,"sort_order"?: number,"status"?: Database["public"]['Enums']["job_status"],"title": string,"type": Database["public"]['Enums']["job_type"],"updated_at"?: string,"vehicle_id": string
                  }
                  Update: {
                    "budget_cents"?: number | null,"completed_odometer"?: number | null,"completed_on"?: string | null,"created_at"?: string,"description"?: string | null,"diy_hours"?: number | null,"id"?: string,"links"?: (string)[],"notes"?: string | null,"owner_id"?: string,"performed_by"?: Database["public"]['Enums']["performed_by"] | null,"performer_name"?: string | null,"phase_id"?: string | null,"sort_order"?: number,"status"?: Database["public"]['Enums']["job_status"],"title"?: string,"type"?: Database["public"]['Enums']["job_type"],"updated_at"?: string,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "jobs_phase_id_fkey"
      columns: ["phase_id"]
isOneToOne: false
      referencedRelation: "phases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jobs_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"parts": {
                  Row: {
                    "aftermarket_part_number": string | null,"brand": string | null,"category": Database["public"]['Enums']["part_category"],"created_at": string,"fitment_notes": string | null,"id": string,"job_id": string | null,"name": string,"notes": string | null,"oem_part_number": string | null,"order_number": string | null,"owner_id": string,"product_url": string | null,"quantity": number,"replaces_part_id": string | null,"return_by": string | null,"status": Database["public"]['Enums']["part_status"],"superseded_numbers": (string)[],"updated_at": string,"vehicle_id": string,"vendor": string | null,"warranty_notes": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "aftermarket_part_number"?: string | null,"brand"?: string | null,"category"?: Database["public"]['Enums']["part_category"],"created_at"?: string,"fitment_notes"?: string | null,"id"?: string,"job_id"?: string | null,"name": string,"notes"?: string | null,"oem_part_number"?: string | null,"order_number"?: string | null,"owner_id"?: string,"product_url"?: string | null,"quantity"?: number,"replaces_part_id"?: string | null,"return_by"?: string | null,"status"?: Database["public"]['Enums']["part_status"],"superseded_numbers"?: (string)[],"updated_at"?: string,"vehicle_id": string,"vendor"?: string | null,"warranty_notes"?: string | null
                  }
                  Update: {
                    "aftermarket_part_number"?: string | null,"brand"?: string | null,"category"?: Database["public"]['Enums']["part_category"],"created_at"?: string,"fitment_notes"?: string | null,"id"?: string,"job_id"?: string | null,"name"?: string,"notes"?: string | null,"oem_part_number"?: string | null,"order_number"?: string | null,"owner_id"?: string,"product_url"?: string | null,"quantity"?: number,"replaces_part_id"?: string | null,"return_by"?: string | null,"status"?: Database["public"]['Enums']["part_status"],"superseded_numbers"?: (string)[],"updated_at"?: string,"vehicle_id"?: string,"vendor"?: string | null,"warranty_notes"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "parts_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parts_replaces_part_id_fkey"
      columns: ["replaces_part_id"]
isOneToOne: false
      referencedRelation: "parts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parts_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"phases": {
                  Row: {
                    "budget_cents": number | null,"created_at": string,"description": string | null,"id": string,"name": string,"owner_id": string,"sort_order": number,"status": Database["public"]['Enums']["phase_status"],"target_end": string | null,"target_start": string | null,"updated_at": string,"vehicle_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "budget_cents"?: number | null,"created_at"?: string,"description"?: string | null,"id"?: string,"name": string,"owner_id"?: string,"sort_order": number,"status"?: Database["public"]['Enums']["phase_status"],"target_end"?: string | null,"target_start"?: string | null,"updated_at"?: string,"vehicle_id": string
                  }
                  Update: {
                    "budget_cents"?: number | null,"created_at"?: string,"description"?: string | null,"id"?: string,"name"?: string,"owner_id"?: string,"sort_order"?: number,"status"?: Database["public"]['Enums']["phase_status"],"target_end"?: string | null,"target_start"?: string | null,"updated_at"?: string,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "phases_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"task_links": {
                  Row: {
                    "blocks_job": boolean,"created_at": string,"id": string,"job_id": string | null,"owner_id": string,"part_id": string | null,"phase_id": string | null,"task_id": string,"updated_at": string,"watch_item_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "blocks_job"?: boolean,"created_at"?: string,"id"?: string,"job_id"?: string | null,"owner_id"?: string,"part_id"?: string | null,"phase_id"?: string | null,"task_id": string,"updated_at"?: string,"watch_item_id"?: string | null
                  }
                  Update: {
                    "blocks_job"?: boolean,"created_at"?: string,"id"?: string,"job_id"?: string | null,"owner_id"?: string,"part_id"?: string | null,"phase_id"?: string | null,"task_id"?: string,"updated_at"?: string,"watch_item_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_links_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_links_part_id_fkey"
      columns: ["part_id"]
isOneToOne: false
      referencedRelation: "parts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_links_phase_id_fkey"
      columns: ["phase_id"]
isOneToOne: false
      referencedRelation: "phases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_links_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_links_watch_item_id_fkey"
      columns: ["watch_item_id"]
isOneToOne: false
      referencedRelation: "watch_items"
      referencedColumns: ["id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "completed_on": string | null,"created_at": string,"due_on": string | null,"id": string,"notes": string | null,"owner_id": string,"status": Database["public"]['Enums']["task_status"],"title": string,"updated_at": string,"vehicle_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_on"?: string | null,"created_at"?: string,"due_on"?: string | null,"id"?: string,"notes"?: string | null,"owner_id"?: string,"status"?: Database["public"]['Enums']["task_status"],"title": string,"updated_at"?: string,"vehicle_id": string
                  }
                  Update: {
                    "completed_on"?: string | null,"created_at"?: string,"due_on"?: string | null,"id"?: string,"notes"?: string | null,"owner_id"?: string,"status"?: Database["public"]['Enums']["task_status"],"title"?: string,"updated_at"?: string,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"tools": {
                  Row: {
                    "brand": string | null,"created_at": string,"description": string | null,"id": string,"name": string,"notes": string | null,"owner_id": string,"status": Database["public"]['Enums']["tool_status"],"storage_location": string | null,"updated_at": string,"vehicle_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "brand"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"name": string,"notes"?: string | null,"owner_id"?: string,"status"?: Database["public"]['Enums']["tool_status"],"storage_location"?: string | null,"updated_at"?: string,"vehicle_id"?: string | null
                  }
                  Update: {
                    "brand"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"name"?: string,"notes"?: string | null,"owner_id"?: string,"status"?: Database["public"]['Enums']["tool_status"],"storage_location"?: string | null,"updated_at"?: string,"vehicle_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tools_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"vehicles": {
                  Row: {
                    "created_at": string,"current_odometer": number,"generation": string | null,"id": string,"model": string | null,"name": string,"notes": string | null,"owner_id": string,"purchase_date": string | null,"purchase_price_cents": number | null,"updated_at": string,"vin": string | null,"year": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"current_odometer"?: number,"generation"?: string | null,"id"?: string,"model"?: string | null,"name": string,"notes"?: string | null,"owner_id"?: string,"purchase_date"?: string | null,"purchase_price_cents"?: number | null,"updated_at"?: string,"vin"?: string | null,"year"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"current_odometer"?: number,"generation"?: string | null,"id"?: string,"model"?: string | null,"name"?: string,"notes"?: string | null,"owner_id"?: string,"purchase_date"?: string | null,"purchase_price_cents"?: number | null,"updated_at"?: string,"vin"?: string | null,"year"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"watch_checkins": {
                  Row: {
                    "checked_on": string,"created_at": string,"id": string,"observation": string | null,"odometer": number | null,"owner_id": string,"updated_at": string,"watch_item_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "checked_on": string,"created_at"?: string,"id"?: string,"observation"?: string | null,"odometer"?: number | null,"owner_id"?: string,"updated_at"?: string,"watch_item_id": string
                  }
                  Update: {
                    "checked_on"?: string,"created_at"?: string,"id"?: string,"observation"?: string | null,"odometer"?: number | null,"owner_id"?: string,"updated_at"?: string,"watch_item_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "watch_checkins_watch_item_id_fkey"
      columns: ["watch_item_id"]
isOneToOne: false
      referencedRelation: "watch_items"
      referencedColumns: ["id"]
    }
                  ]
                },"watch_item_parts": {
                  Row: {
                    "created_at": string,"owner_id": string,"part_id": string,"updated_at": string,"watch_item_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"owner_id"?: string,"part_id": string,"updated_at"?: string,"watch_item_id": string
                  }
                  Update: {
                    "created_at"?: string,"owner_id"?: string,"part_id"?: string,"updated_at"?: string,"watch_item_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "watch_item_parts_part_id_fkey"
      columns: ["part_id"]
isOneToOne: false
      referencedRelation: "parts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "watch_item_parts_watch_item_id_fkey"
      columns: ["watch_item_id"]
isOneToOne: false
      referencedRelation: "watch_items"
      referencedColumns: ["id"]
    }
                  ]
                },"watch_items": {
                  Row: {
                    "closed_on": string | null,"created_at": string,"description": string | null,"id": string,"next_followup_odometer": number | null,"next_followup_on": string | null,"owner_id": string,"promoted_job_id": string | null,"severity": Database["public"]['Enums']["watch_severity"],"status": Database["public"]['Enums']["watch_status"],"system": Database["public"]['Enums']["watch_system"],"title": string,"updated_at": string,"vehicle_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_on"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"next_followup_odometer"?: number | null,"next_followup_on"?: string | null,"owner_id"?: string,"promoted_job_id"?: string | null,"severity"?: Database["public"]['Enums']["watch_severity"],"status"?: Database["public"]['Enums']["watch_status"],"system"?: Database["public"]['Enums']["watch_system"],"title": string,"updated_at"?: string,"vehicle_id": string
                  }
                  Update: {
                    "closed_on"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"next_followup_odometer"?: number | null,"next_followup_on"?: string | null,"owner_id"?: string,"promoted_job_id"?: string | null,"severity"?: Database["public"]['Enums']["watch_severity"],"status"?: Database["public"]['Enums']["watch_status"],"system"?: Database["public"]['Enums']["watch_system"],"title"?: string,"updated_at"?: string,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "watch_items_promoted_job_id_fkey"
      columns: ["promoted_job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "watch_items_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "create_vehicle_with_phases":
{ Args: { "p_current_odometer"?: number,"p_generation"?: string,"p_model"?: string,"p_name": string,"p_phase_names": (string)[],"p_purchase_date"?: string,"p_purchase_price_cents"?: number,"p_vin"?: string,"p_year"?: number }; Returns: string
                           }
          }
          Enums: {
            "attachment_kind": "photo"|"clip"|"receipt"|"document","attachment_tag": "before"|"during"|"after","expense_category": "part"|"tool"|"shop_labor_bay"|"shipping_tax_fees"|"fluids_consumables"|"other"|"sale","expense_state": "committed"|"paid","job_status": "not_started"|"waiting_on_parts"|"ready"|"in_progress"|"done"|"cancelled","job_type": "maintenance"|"repair"|"modification"|"diagnosis","part_category": "suspension"|"armor"|"lighting"|"recovery"|"electrical"|"tires_wheels"|"interior"|"fluids"|"other","part_status": "idea"|"researching"|"wishlist"|"ordered"|"received"|"installed"|"removed"|"sold"|"returned","performed_by": "diy"|"rented_bay"|"shop","phase_status": "planned"|"active"|"done","task_status": "open"|"done"|"dropped","tool_status": "owned"|"borrowed"|"rented"|"need_to_buy","watch_severity": "monitor"|"concerning"|"act_soon","watch_status": "watching"|"promoted"|"resolved"|"dismissed","watch_system": "engine"|"drivetrain"|"suspension"|"steering"|"brakes"|"electrical"|"body"|"other"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "attachment_kind": ["photo", "clip", "receipt", "document"],"attachment_tag": ["before", "during", "after"],"expense_category": ["part", "tool", "shop_labor_bay", "shipping_tax_fees", "fluids_consumables", "other", "sale"],"expense_state": ["committed", "paid"],"job_status": ["not_started", "waiting_on_parts", "ready", "in_progress", "done", "cancelled"],"job_type": ["maintenance", "repair", "modification", "diagnosis"],"part_category": ["suspension", "armor", "lighting", "recovery", "electrical", "tires_wheels", "interior", "fluids", "other"],"part_status": ["idea", "researching", "wishlist", "ordered", "received", "installed", "removed", "sold", "returned"],"performed_by": ["diy", "rented_bay", "shop"],"phase_status": ["planned", "active", "done"],"task_status": ["open", "done", "dropped"],"tool_status": ["owned", "borrowed", "rented", "need_to_buy"],"watch_severity": ["monitor", "concerning", "act_soon"],"watch_status": ["watching", "promoted", "resolved", "dismissed"],"watch_system": ["engine", "drivetrain", "suspension", "steering", "brakes", "electrical", "body", "other"]
          }
        }
} as const
