# GPW Website Modernization – PRZEDMIOT POSTEPOWANIA JEST OBJĘTY REGULACJAMI DORA W ZAKRESIE ŚWIADCZENIA USŁUG ICT. - EXPLAIN BASED ON FILE CONTENT AND SUGGEST WHAT NEEDS TO BE DONE - SHORTLY IN 10 SENTENCES MAX.

Let me analyze the RFP document to understand the DORA compliance requirement and what needs to be done.

**Key findings from the document:**

1. **DORA Reference**: The document explicitly states "Przedmiot postepowania jest objęty regulacjami DORA w zakresie świadczenia usług ICT" (The subject of the procedure is covered by DORA regulations in the scope of ICT services).

2. **Context**: GPW (Warsaw Stock Exchange) is a financial entity, and DORA (Digital Operational Resilience Act - EU Regulation 2022/2554) applies to financial entities and their ICT third-party service providers.

3. **Related Requirements in the Document**:
   - Security requirements (OWASP, SAST/DAST, dependency scanning)
   - Observability (monitoring, logging, audit)
   - Infrastructure on Microsoft Azure with Kubernetes/AKS
   - CI/CD via GitHub Actions
   - Non-functional requirements including security, performance, availability
   - Documentation requirements for architecture, security, incident management
   - Hypercare period for post-deployment stabilization

4. **What DORA Requires**:
   - ICT risk management
   - ICT incident reporting
   - Digital operational resilience testing
   - ICT third-party risk management
   - Information sharing

5. **What Needs to Be Done**:
   - Ensure the solution architecture supports DORA compliance
   - Implement proper logging and monitoring for incident detection
   - Create incident management procedures
   - Ensure business continuity/disaster recovery capabilities
   - Document ICT risk management approach
   - Plan for resilience testing (including penetration testing)
   - Establish clear escalation paths for ICT incidents
   - Ensure the CMS and integrations meet DORA requirements
   - Prepare documentation for regulatory reporting
   - Consider ICT third-party risk if using SaaS/external services
</think>

## DORA Compliance Analysis for GPW Website Modernization

### Explanation

The statement "Przedmiot postepowania jest objęty regulacjami DORA w zakresie świadczenia usług ICT" means that this procurement falls under the **EU Digital Operational Resilience Act (Regulation 2022/2554)**. Since GPW is a financial entity (stock exchange), and the project involves providing ICT services (website platform, CMS, integrations), DORA compliance is mandatory.

### What Needs to Be Done:

1. **ICT Risk Management**: Establish and document an ICT risk management framework covering identification, protection, detection, response, and recovery.

2. **Incident Management**: Implement robust logging, monitoring, and alerting capabilities to detect and report major ICT incidents per DORA timelines.

3. **Resilience Testing**: Plan for digital operational resilience testing including penetration testing (TIS - Threat-led Penetration Testing) before go-live.

4. **Business Continuity**: Ensure disaster recovery and business continuity plans are in place with defined RTO/RPO targets.

5. **Third-Party ICT Risk**: Document dependencies on external services (Azure, GitHub, CMS provider) and manage associated risks.

6. **Documentation**: Prepare comprehensive documentation for ICT risk management, incident reporting procedures, and testing results.

7. **Security by Design**: Apply secure development practices (OWASP, SAST/DAST, dependency scanning) as already required in the RFP.

8. **Observability**: Implement comprehensive monitoring dashboards and alerting for critical integrations and services.

9. **Contractual Compliance**: Ensure service level agreements (SLAs) align with DORA requirements for availability and incident response.

10. **Regulatory Reporting Readiness**: Build capabilities to generate reports required by Polish financial authorities (KNF) under DORA.

---

**Key Insight**: The RFP already incorporates many DORA-aligned requirements (security testing, observability, documentation), but the vendor must explicitly address DORA compliance in their solution architecture and operational procedures.