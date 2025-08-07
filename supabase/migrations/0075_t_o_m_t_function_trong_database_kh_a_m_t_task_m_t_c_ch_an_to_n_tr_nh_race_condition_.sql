CREATE OR REPLACE FUNCTION public.get_and_claim_seeding_task()
RETURNS SETOF seeding_tasks
LANGUAGE plpgsql
AS $$
DECLARE
    task_id_to_process BIGINT;
BEGIN
    -- Atomically find and claim one task
    SELECT id INTO task_id_to_process
    FROM public.seeding_tasks
    WHERE status = 'pending'
    ORDER BY created_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF task_id_to_process IS NOT NULL THEN
        -- If a task was found, update its status to 'running'
        UPDATE public.seeding_tasks
        SET status = 'running', updated_at = NOW()
        WHERE id = task_id_to_process;

        -- Return the claimed task
        RETURN QUERY SELECT * FROM public.seeding_tasks WHERE id = task_id_to_process;
    END IF;
END;
$$;