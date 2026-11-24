drop policy if exists "Published skill paths are readable" on public.skill_paths;
create policy "Published skill paths are readable"
on public.skill_paths for select to anon, authenticated
using (status = 'published');
drop policy if exists "Published skill nodes are readable" on public.skill_nodes;
create policy "Published skill nodes are readable"
on public.skill_nodes for select to anon, authenticated
using (
  exists (
    select 1
    from public.skill_paths sp
    where sp.id = skill_nodes.path_id and sp.status = 'published'
  )
);
drop policy if exists "Published skill prerequisites are readable" on public.skill_node_prerequisites;
create policy "Published skill prerequisites are readable"
on public.skill_node_prerequisites for select to anon, authenticated
using (
  exists (
    select 1
    from public.skill_nodes node
    join public.skill_nodes prerequisite on prerequisite.id = skill_node_prerequisites.prerequisite_node_id
    join public.skill_paths path on path.id = node.path_id
    where node.id = skill_node_prerequisites.node_id
      and prerequisite.path_id = node.path_id
      and path.status = 'published'
  )
);
notify pgrst, 'reload schema';
