import { COLORS } from "../theme";
import IncidentRow from "./IncidentRow";
import { renderDetailsTab } from "./DetailsTab";
import { renderCamerasTab } from "./CamerasTab";
import type { Incident, NearestCamera } from "../../shared/types";

interface Props {
  incident: Incident | null;
  activeTab: string;
  cameras: NearestCamera[];
  activeCameraIndex: number;
  setActiveCameraIndex: React.Dispatch<React.SetStateAction<number>>;
  isLoadingCameras: boolean;
  incidents: Incident[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  onSelectIncident: (incident: Incident) => void;
}

// selected incident's details/cameras tab, else the incident list; one component so react reuses the root div on switch
function SheetBody({ incident, activeTab, cameras, activeCameraIndex, setActiveCameraIndex, isLoadingCameras, incidents, expandedId, setExpandedId, onSelectIncident }: Props) {
  if (incident) {
    return (
      <div style={{ padding: "4px 16px 0 16px", animation: "ds-fade 0.3s ease" }}>
        {activeTab === "details"
          ? renderDetailsTab(incident)
          : renderCamerasTab({ cameras, activeIndex: activeCameraIndex, setActiveIndex: setActiveCameraIndex, isLoading: isLoadingCameras })}
      </div>
    );
  }

  return (
    <div>
      {incidents.map((inc, i) => (
        <IncidentRow
          key={inc.id}
          inc={inc}
          isLast={i === incidents.length - 1}
          isOpen={expandedId === inc.id}
          setExpandedId={setExpandedId}
          onSelectIncident={onSelectIncident}
        />
      ))}
      {incidents.length === 0 && (
        <div style={{ textAlign: "center", color: COLORS.sub, fontWeight: 600, padding: "40px 20px" }}>No incidents found.</div>
      )}
    </div>
  );
}

export default SheetBody;
