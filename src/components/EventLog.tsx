import React from 'react';
import { 
  AlertCircle, 
  CheckCircle, 
  Info, 
  AlertTriangle,
  Zap,
  Settings,
  Clock,
  Crown
} from 'lucide-react';
import { EventLogProps, EventType, LogEvent } from '@/types';

const EventLog: React.FC<EventLogProps> = ({ events, maxHeight = 'max-h-96' }) => {
  const getEventIcon = (type: EventType) => {
    switch (type) {
      case EventType.INITIALIZATION:
        return <Info className="w-4 h-4 text-blue-500" />;
      case EventType.FAILURE:
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case EventType.RECOVERY_ACTION:
        return <Settings className="w-4 h-4 text-purple-500" />;
      case EventType.STATUS_CHANGE:
        return <Clock className="w-4 h-4 text-gray-500" />;
      case EventType.ELECTION:
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case EventType.QUORUM:
        return <Zap className="w-4 h-4 text-orange-500" />;
      case EventType.WARNING:
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case EventType.SUCCESS:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  const getEventClasses = (type: EventType) => {
    switch (type) {
      case EventType.INITIALIZATION:
        return 'border-l-4 border-green-700 bg-white';
      case EventType.FAILURE:
        return 'border-l-4 border-green-800 bg-white';
      case EventType.RECOVERY_ACTION:
        return 'border-l-4 border-green-600 bg-white';
      case EventType.STATUS_CHANGE:
        return 'border-l-4 border-green-700 bg-white';
      case EventType.ELECTION:
        return 'border-l-4 border-green-600 bg-white';
      case EventType.QUORUM:
        return 'border-l-4 border-green-700 bg-white';
      case EventType.WARNING:
        return 'border-l-4 border-green-800 bg-white';
      case EventType.SUCCESS:
        return 'border-l-4 border-green-700 bg-white';
      default:
        return 'border-l-4 border-green-700 bg-white';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getEventTypeLabel = (type: EventType) => {
    switch (type) {
      case EventType.INITIALIZATION:
        return 'INIT';
      case EventType.FAILURE:
        return 'FAIL';
      case EventType.RECOVERY_ACTION:
        return 'RECOVERY';
      case EventType.STATUS_CHANGE:
        return 'STATUS';
      case EventType.ELECTION:
        return 'ELECTION';
      case EventType.QUORUM:
        return 'QUORUM';
      case EventType.WARNING:
        return 'WARNING';
      case EventType.SUCCESS:
        return 'SUCCESS';
      default:
        return 'INFO';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border-2 border-green-700">
      <div className="bg-white px-4 py-3 border-b-2 border-green-700 rounded-t-lg">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Clock className="w-5 h-5 text-gray-600" />
          <span>Event Log</span>
        </h3>
      </div>
      
      <div className={`${maxHeight} overflow-y-auto p-4 space-y-3`}>
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>No events yet. Start a simulation to see the log.</p>
          </div>
        ) : (
          events.map((event: LogEvent) => (
            <div
              key={event.id}
              className={`p-3 rounded-md ${getEventClasses(event.type)}`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 pt-0.5">
                  {getEventIcon(event.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-mono font-semibold text-gray-600">
                      {formatTimestamp(event.timestamp)}
                    </span>
                    <span className="text-xs px-2 py-1 bg-white rounded text-gray-700 font-medium">
                      {getEventTypeLabel(event.type)}
                    </span>
                  </div>
                  
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {event.message}
                  </p>
                  
                  {event.details && (
                    <p className="text-xs text-gray-600 italic">
                      {event.details}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {events.length > 0 && (
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 rounded-b-lg">
          <p className="text-xs text-gray-500 text-center">
            {events.length} event{events.length !== 1 ? 's' : ''} logged
          </p>
        </div>
      )}
    </div>
  );
};

export default EventLog;
