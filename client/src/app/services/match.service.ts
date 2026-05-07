import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Match } from '../models/match.model';

export interface ConnectCandidate {
  persona: {
    _id: string;
    name: string;
    traits: string[];
    interests: string[];
    connectionGoal: string;
    moodTag: string;
    bio: string;
  };
  owner: { _id: string; name: string; city: string; state: string };
  score: number;
  traitOverlap: number;
  interestSimilarity: number;
  goalAlignment: number;
  moodAlignment: number;
  proximity: { tier: number; label: string };
}

export interface ConnectStackResponse {
  fromPersona: { _id: string; name: string };
  me: { city: string; state: string };
  candidates: ConnectCandidate[];
}

@Injectable({ providedIn: 'root' })
export class MatchService {
  private matchesSubject = new BehaviorSubject<Match[]>([]);
  matches$ = this.matchesSubject.asObservable();

  topMatches$: Observable<Match[]> = this.matches$.pipe(
    map(list => [...list].sort((a, b) => b.score - a.score).slice(0, 10))
  );

  constructor(private http: HttpClient) {}

  load(): Observable<Match[]> {
    return this.http.get<Match[]>(`${environment.apiUrl}/matches`)
      .pipe(tap(list => this.matchesSubject.next(list)));
  }

  rescoreAll(): Observable<{ ok: boolean; rescored: number }> {
    return this.http.post<{ ok: boolean; rescored: number }>(`${environment.apiUrl}/matches/score`, {});
  }

  getReport(matchId: string): Observable<{ report: string }> {
    return this.http.get<{ report: string }>(`${environment.apiUrl}/matches/${matchId}/report`);
  }

  getConnectStack(personaId: string): Observable<ConnectStackResponse> {
    return this.http.get<ConnectStackResponse>(`${environment.apiUrl}/matches/connect`, {
      params: { personaId },
    });
  }

  swipe(fromPersonaId: string, toPersonaId: string, direction: 'right' | 'left'): Observable<{ ok: boolean; mutual: boolean }> {
    return this.http.post<{ ok: boolean; mutual: boolean }>(`${environment.apiUrl}/matches/swipe`, {
      fromPersonaId, toPersonaId, direction,
    });
  }

  undoSwipe(fromPersonaId: string, toPersonaId: string): Observable<{ ok: boolean; removed: boolean }> {
    return this.http.delete<{ ok: boolean; removed: boolean }>(`${environment.apiUrl}/matches/swipe`, {
      params: { fromPersonaId, toPersonaId },
    });
  }
}
