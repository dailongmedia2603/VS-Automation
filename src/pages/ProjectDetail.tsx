import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { ProjectDetailProvider, ProjectDetailContent } from '@/contexts/ProjectDetailContext';
import { useSidebar } from '@/contexts/SidebarContext';

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { setIsCollapsed } = useSidebar();

  // Auto-collapse sidebar when entering project detail
  useEffect(() => {
    setIsCollapsed(true);
  }, [setIsCollapsed]);

  if (!projectId) {
    return <div>Project ID is required.</div>;
  }

  return (
    <ProjectDetailProvider projectId={projectId}>
      <ProjectDetailContent />
    </ProjectDetailProvider>
  );
};

export default ProjectDetail;