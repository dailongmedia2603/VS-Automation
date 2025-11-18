import { useParams } from 'react-router-dom';
import { ProjectDetailProvider, ProjectDetailContent } from '@/contexts/ProjectDetailContext';

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();

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