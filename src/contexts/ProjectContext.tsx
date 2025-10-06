import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Project, ProjectMember } from '../types';

interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  members: ProjectMember[];
  loading: boolean;
  createProject: (name: string) => Promise<Project | null>;
  joinProject: (inviteCode: string) => Promise<boolean>;
  switchProject: (projectId: string) => void;
  loadProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = async () => {
    if (!user) {
      setProjects([]);
      setCurrentProject(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_members!inner(user_id)
      `)
      .eq('project_members.user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const mappedProjects = data.map(p => ({
        id: p.id,
        name: p.name,
        inviteCode: p.invite_code,
        ownerId: p.owner_id,
        createdAt: new Date(p.created_at).getTime(),
        updatedAt: new Date(p.updated_at).getTime()
      }));
      setProjects(mappedProjects);

      if (mappedProjects.length > 0 && !currentProject) {
        setCurrentProject(mappedProjects[0]);
      }
    }
    setLoading(false);
  };

  const loadMembers = async (projectId: string) => {
    const { data, error } = await supabase
      .from('project_members')
      .select(`
        *,
        profiles(email)
      `)
      .eq('project_id', projectId);

    if (!error && data) {
      const mappedMembers = data.map(m => ({
        id: m.id,
        projectId: m.project_id,
        userId: m.user_id,
        userEmail: m.profiles?.email,
        joinedAt: new Date(m.joined_at).getTime()
      }));
      setMembers(mappedMembers);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [user]);

  useEffect(() => {
    if (currentProject) {
      loadMembers(currentProject.id);
    }
  }, [currentProject]);

  const createProject = async (name: string): Promise<Project | null> => {
    if (!user) return null;

    const generateInviteCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    const inviteCode = generateInviteCode();

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        invite_code: inviteCode,
        owner_id: user.id
      })
      .select()
      .single();

    if (error || !data) return null;

    await supabase
      .from('project_members')
      .insert({
        project_id: data.id,
        user_id: user.id
      });

    const newProject: Project = {
      id: data.id,
      name: data.name,
      inviteCode: data.invite_code,
      ownerId: data.owner_id,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime()
    };

    setProjects(prev => [newProject, ...prev]);
    setCurrentProject(newProject);

    return newProject;
  };

  const joinProject = async (inviteCode: string): Promise<boolean> => {
    if (!user) return false;

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('invite_code', inviteCode)
      .maybeSingle();

    if (projectError || !project) return false;

    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: user.id
      });

    if (memberError) return false;

    await loadProjects();
    return true;
  };

  const switchProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setCurrentProject(project);
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        projects,
        members,
        loading,
        createProject,
        joinProject,
        switchProject,
        loadProjects
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
