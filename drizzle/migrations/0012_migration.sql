CREATE TABLE public.mcp_tool_blocks (
  user_id uuid NOT NULL,
  client_id text NOT NULL,
  tool_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, client_id, tool_name)
);
GRANT SELECT, INSERT, DELETE ON public.mcp_tool_blocks TO authenticated;
GRANT ALL ON public.mcp_tool_blocks TO service_role;
ALTER TABLE public.mcp_tool_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own blocks read" ON public.mcp_tool_blocks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own blocks insert" ON public.mcp_tool_blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own blocks delete" ON public.mcp_tool_blocks FOR DELETE TO authenticated USING (auth.uid() = user_id);