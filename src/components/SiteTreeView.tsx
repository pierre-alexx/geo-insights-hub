import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, Globe } from "lucide-react";
import { TreeNode } from "@/services/geoService";
import { useNavigate } from "react-router-dom";

interface TreeNodeWithScore extends TreeNode {
  avgScore?: number;
  pageId?: string;
}

interface SiteTreeNodeProps {
  node: TreeNodeWithScore;
  scores: Record<string, { avgScore: number; pageId: string }>;
}

const SiteTreeNode = ({ node, scores }: SiteTreeNodeProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const navigate = useNavigate();
  
  const scoreData = scores[node.url];
  const score = scoreData?.avgScore || 0;
  const pageId = scoreData?.pageId;

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return "bg-green-500";
    if (score >= 0.4) return "bg-orange-500";
    return "bg-red-500";
  };

  const handleClick = () => {
    if (pageId) {
      navigate(`/page/${pageId}`);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center gap-2 py-1 hover:bg-muted/50 px-2 rounded cursor-pointer" onClick={handleClick}>
        {node.children.length > 0 ? (
          <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        ) : (
          <div className="w-6" />
        )}
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm flex-1">{node.title}</span>
        {scoreData ? (
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${getScoreColor(score)}`} />
            <Badge variant="outline">{Math.round(score * 100)}%</Badge>
          </div>
        ) : (
          <Badge variant="secondary">No tests</Badge>
        )}
      </div>
      {node.children.length > 0 && (
        <CollapsibleContent>
          <div className="ml-6 border-l pl-4">
            {node.children.map((child, idx) => (
              <SiteTreeNode key={idx} node={child} scores={scores} />
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
};

interface SiteTreeViewProps {
  tree: TreeNode[];
  scores: Record<string, { avgScore: number; pageId: string }>;
}

export const SiteTreeView = ({ tree, scores }: SiteTreeViewProps) => {
  if (tree.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No site structure available. Start a crawl to see the tree view.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span>&gt;70%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-orange-500" />
          <span>40-70%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span>&lt;40%</span>
        </div>
      </div>
      {tree.map((node, idx) => (
        <SiteTreeNode key={idx} node={node} scores={scores} />
      ))}
    </div>
  );
};